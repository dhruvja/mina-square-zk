import { Square } from './Square.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  AccountUpdate,
} from 'snarkyjs';

(async function main() {
  await isReady;

  console.log('SnarkyJS is loaded');
  const localChain = Mina.LocalBlockchain();
  Mina.setActiveInstance(localChain);
  const deployerAccount = localChain.testAccounts[0].privateKey;

  const zkAppPrivateKey = PrivateKey.random();
  const zkAppAddress = zkAppPrivateKey.toPublicKey();

  const contract = new Square(zkAppAddress);
  const deployTxn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    contract.deploy({ zkappKey: zkAppPrivateKey });
    contract.sign(zkAppPrivateKey);
  });
  await deployTxn.send();

  const initialValue = contract.num.get();
  console.log('Initial state after init: ', initialValue.toString());

  // Updating state to a value which is a square of the initial value
  const tx1 = await Mina.transaction(deployerAccount, () => {
    contract.update(Field(16));
    contract.sign(zkAppPrivateKey);
  });
  await tx1.send();

  const updatedValue1 = contract.num.get();
  console.log('state after update 1: ', updatedValue1.toString());

  // Updating state to a value which is not the square and should fail
  try {
    const tx2 = await Mina.transaction(deployerAccount, () => {
      contract.update(Field(100)); // Not the square of 16 so the tx would fail
      contract.sign(zkAppPrivateKey);
    });
    await tx2.send();

    // wouldnt come here
    const updatedValue = contract.num.get();
    console.log('state after update 2: ', updatedValue.toString());
  } catch (error: any) {
    console.log(error.message);
  }
  const updatedValue2 = contract.num.get();
  console.log('state after update 2: ', updatedValue2.toString());

  // Performing the correct tx by sending the square of the current state (16) which is 256
  const tx3 = await Mina.transaction(deployerAccount, () => {
    contract.update(Field(256)); // square of 16 so the tx would pass
    contract.sign(zkAppPrivateKey);
  });
  await tx3.send();
  const updatedValue3 = contract.num.get();
  console.log('state after update 3:', updatedValue3.toString());

  console.log('Shutting down');
  await shutdown();
})();
