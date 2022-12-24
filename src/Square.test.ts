import { Square } from './Square';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  AccountUpdate,
  PublicKey,
} from 'snarkyjs';

describe('Integration tests', () => {
  let deployerAccount: PrivateKey;
  let zkAppPrivateKey: PrivateKey;
  let zkAppAddress: PublicKey;
  let contract: Square;
  beforeAll(async () => {
    await isReady;
    const localChain = Mina.LocalBlockchain();
    Mina.setActiveInstance(localChain);
    deployerAccount = localChain.testAccounts[0].privateKey;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();

    contract = new Square(zkAppAddress);

    const tx = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      contract.deploy({ zkappKey: zkAppPrivateKey });
      contract.sign(zkAppPrivateKey);
    });
    await tx.send();
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  it('Sets the current state to 4', async () => {
    const initialValue = contract.num.get();
    expect(initialValue).toEqual(Field(4));
  });

  it('Correctly update the state if it is square of the existing value', async () => {
    const tx = await Mina.transaction(deployerAccount, () => {
      contract.update(Field(16));
      contract.sign(zkAppPrivateKey);
    });
    await tx.send();

    const updatedValue = contract.num.get();
    expect(updatedValue).toEqual(Field(16));
  });

  it('Does not update if the new state is not square of the existing value', async () => {
    try {
      const tx = await Mina.transaction(deployerAccount, () => {
        contract.update(Field(20));
        contract.sign(zkAppPrivateKey);
      });
      await tx.send();
      const updatedValue = contract.num.get();
      expect(updatedValue).not.toEqual(Field(20));
    } catch (error) {
      const existingValue = contract.num.get();
      expect(existingValue).toEqual(Field(16));
    }
  });
});
