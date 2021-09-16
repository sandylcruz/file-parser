const stdin = require('mock-stdin').stdin();
const fileParser = require('../');

const inputToLines = (input) => input.trim().split('\n');

const getOutputForInput = (input) => {
  const outputPromise = fileParser();

  stdin.send(inputToLines(input));

  stdin.end();

  return outputPromise;
};

describe('fileParser', () => {
  afterEach(() => {
    stdin.reset(true);
  });

  describe('error handling', () => {
    it('throws the correct error when the first line is not correct', () => {
      return expect(getOutputForInput(`// file`)).rejects.toEqual(
        new Error('Expected input to be marked as Files, but it was not.')
      );
    });

    it('throws the correct error when the second line is not correct', () => {
      return expect(
        getOutputForInput(`
/* Files */
typo
`)
      ).rejects.toEqual(
        new Error(
          'Expected second line to specify a valid batch, but it did not.'
        )
      );
    });

    it('throws the correct error when the third line is not correct', () => {
      return expect(
        getOutputForInput(`
/* Files */
Batch: 99
typo
`)
      ).rejects.toEqual(
        new Error(
          'Expected input to be marked as valid description, but it was not'
        )
      );
    });

    it('throws the correct error when the fourth line is not correct', () => {
      return expect(
        getOutputForInput(`
/* Files */
Batch: 99
Description: Payroll for January
=
`)
      ).rejects.toEqual(
        new Error('Expected input to be marked as line break, but it was not.')
      );
    });

    it('throws the correct error when the fifth line is not correct', () => {
      return expect(
        getOutputForInput(`
/* Files */
Batch: 99
Description: Payroll for January
==
typo
`)
      ).rejects.toEqual(
        new Error(
          'Expected input to be marked as valid transaction, but it was not.'
        )
      );
    });

    it('throws the correct error when the sixth line is not correct', () => {
      return expect(
        getOutputForInput(`
/* Files */
Batch: 99
Description: Payroll for January
==
Transaction: 301
typo
`)
      ).rejects.toEqual(
        new Error(
          'Expected originator to be marked with something valid, but it was not.'
        )
      );
    });

    it('throws the correct error when the seventh line is not correct', () => {
      return expect(
        getOutputForInput(`
/* Files */
Batch: 99
Description: Payroll for January
==
Transaction: 301
Originator: 111222333 / 9991
typo
`)
      ).rejects.toEqual(
        new Error(
          'Expected recipient to be marked with something valid, but it was not.'
        )
      );
    });

    it('throws the correct error when the eighth line is not correct', () => {
      return expect(
        getOutputForInput(`
/* Files */
Batch: 99
Description: Payroll for January
==
Transaction: 301
Originator: 111222333 / 9991
Recipient: 444555666 / 123456
typo
`)
      ).rejects.toEqual(
        new Error(
          'Expected type to be marked with something valid, but it was not.'
        )
      );
    });

    it('throws the correct error when the ninth line is not correct', () => {
      return expect(
        getOutputForInput(`
/* Files */
Batch: 99
Description: Payroll for January
==
Transaction: 301
Originator: 111222333 / 9991
Recipient: 444555666 / 123456
Type: Credit
typo
`)
      ).rejects.toEqual(
        new Error('Expected amount to be something valid, but it was not.')
      );
    });

    it('throws an error if something other than a number is inputted', () => {
      return expect(
        getOutputForInput(`
/* Files */
Batch: '99'
Description: Payroll for January
==
Transaction: 301
Originator: 111222333 / 9991
Recipient: 444555666 / 123456
Type: Credit
typo
`)
      ).rejects.toEqual(
        new Error('Expected input to be a sequence of digits, but it was not.')
      );
    });

    it('throws an error if something other than a number is inputted', () => {
      return expect(
        getOutputForInput(`
/* Files */
Batch: '99'
Description: Payroll for January
==
Transaction: 301
Originator: 111222333 / 9991
Recipient: 444555666 / 123456
Type: Credit
typo
`)
      ).rejects.toEqual(
        new Error('Expected input to be a sequence of digits, but it was not.')
      );
    });
  });

  describe('successfully parsed outputs', () => {
    it('handles simple cases', () => {
      return getOutputForInput(`
/* Files */
Batch: 99
Description: Payroll for January
==
Transaction: 301
Originator: 111222333 / 9991
Recipient: 444555666 / 123456
Type: Credit
Amount: 10000
      `).then((data) => {
        expect(data).toMatchSnapshot();
      });
    });

    it('handles cases where there is a comment', () => {
      return getOutputForInput(`
/* Files */
Batch: 99
Description: Payroll for January
==
Transaction: 301
Originator: 111222333 / 9991
Recipient: 444555666 / 123456
Type: Credit
Amount: 10000
==
Comment: Payment for invoice 100
Transaction: 302
Originator: 111222333 / 9991
Recipient: 123456789 / 55550
Type: Credit
Amount: 380100
==
      `).then((data) => {
        expect(data).toMatchSnapshot();
      });
    });

    it('handles correctly debits from the recipient/s account when marked as transaction is marked as `debit` ', () => {
      return getOutputForInput(`
/* Files */
Batch: 99
Description: Payroll for January
==
Transaction: 301
Originator: 111222333 / 9991
Recipient: 444555666 / 123456
Type: Credit
Amount: 10000
==
Comment: Payment for invoice 100
Transaction: 302
Originator: 111222333 / 9991
Recipient: 123456789 / 55550
Type: Credit
Amount: 380100
==
Transaction: 305
Originator: 111222333 / 9992
Recipient: 444555666 / 8675309
Type: Debit
Amount: 999
      `).then((data) => {
        expect(data).toMatchSnapshot();
      });
    });
  });
});
