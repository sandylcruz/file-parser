const readline = require('readline');

const NUMBER_OF_HEADER_LINES = 3;

const validateIsInteger = (string) => {
  if (!string.match(/^\d+$/)) {
    throw new Error(
      'Expected input to be a sequence of digits, but it was not.'
    );
  }
};

const parseHeaders = ({ line, data, lineCounter, incrementCounter }) => {
  if (lineCounter === 0) {
    if (line !== '/* Files */') {
      throw new Error('Expected input to be marked as Files, but it was not.');
    }
  } else if (lineCounter === 1) {
    if (!line.startsWith('Batch: ')) {
      throw new Error(
        'Expected second line to specify a valid batch, but it did not.'
      );
    }
    const batchValue = line.replace(/^Batch\: /, '');
    validateIsInteger(batchValue);
    const numberBatchValue = Number(batchValue);
    data.batch = numberBatchValue;
  } else {
    if (!line.startsWith('Description: ')) {
      throw new Error(
        'Expected input to be marked as valid description, but it was not'
      );
    }
    const descriptionValue = line.replace(/^Description\: /, '');
    data.description = descriptionValue;
  }

  incrementCounter();
};

const getRoutingAndAccountNumber = (string) => {
  const [routingNumberAsString, accountNumberAsString] = string.split(' / ');

  [routingNumberAsString, accountNumberAsString].forEach(validateIsInteger);

  const accountNumber = Number(accountNumberAsString);
  const routingNumber = Number(routingNumberAsString);
  return { accountNumber, routingNumber };
};

const hydrateTransactionData = ({
  transactionData,
  routingNumber,
  accountNumber,
}) => {
  let routingData = transactionData[routingNumber];

  if (!routingData) {
    routingData = {};
    transactionData[routingNumber] = routingData;
  }

  let accountData = routingData[accountNumber];

  if (!accountData) {
    accountData = { balance: 0 };
    routingData[accountNumber] = accountData;
  }
};

const addPair = (pairs, pair) => {
  pairs.push(pair);
};

const addToBalance = (account, value) => {
  account.balance += value;
};

const removeFromBalance = (account, value) => {
  account.balance -= value;
};

const performTransaction = (
  { amount, originator, recipient, type },
  transactionData
) => {
  let giver = originator;
  let taker = recipient;

  if (type === 'Debit') {
    giver = recipient;
    taker = originator;
  }

  removeFromBalance(
    transactionData[giver.routingNumber][giver.accountNumber],
    amount
  );
  addToBalance(
    transactionData[taker.routingNumber][taker.accountNumber],
    amount
  );
};

const parseTransactions = ({
  incrementCounter,
  line,
  lineCounter,
  pairs,
  transactionData,
  transactionState,
}) => {
  const normalizedLineCount = lineCounter - NUMBER_OF_HEADER_LINES;
  const transactionLineNumber = normalizedLineCount % 6;

  if (transactionLineNumber === 0) {
    if (!line.startsWith('==')) {
      throw new Error(
        'Expected input to be marked as line break, but it was not.'
      );
    }
  } else if (transactionLineNumber === 1) {
    if (line.startsWith('Comment: ')) {
      return;
    }

    if (!line.startsWith('Transaction: ')) {
      throw new Error(
        'Expected input to be marked as valid transaction, but it was not.'
      );
    }

    const transactionNumber = line.replace(/^Transaction\: /, '');
    validateIsInteger(transactionNumber);
  } else if (transactionLineNumber === 2) {
    if (!line.startsWith('Originator: ')) {
      throw new Error(
        'Expected originator to be marked with something valid, but it was not.'
      );
    }

    const originatorValues = line.replace(/^Originator\: /, '');
    const { routingNumber, accountNumber } =
      getRoutingAndAccountNumber(originatorValues);

    transactionState.originator = { routingNumber, accountNumber };
    hydrateTransactionData({ transactionData, routingNumber, accountNumber });
    addPair(pairs, { accountNumber, routingNumber });
  } else if (transactionLineNumber === 3) {
    if (!line.startsWith('Recipient: ')) {
      throw new Error(
        'Expected recipient to be marked with something valid, but it was not.'
      );
    }

    const recipientValues = line.replace(/^Recipient\: /, '');
    const { routingNumber, accountNumber } =
      getRoutingAndAccountNumber(recipientValues);

    transactionState.recipient = { routingNumber, accountNumber };
    hydrateTransactionData({ transactionData, routingNumber, accountNumber });
    addPair(pairs, { accountNumber, routingNumber });
  } else if (transactionLineNumber === 4) {
    if (!line.startsWith('Type: ')) {
      throw new Error(
        'Expected type to be marked with something valid, but it was not.'
      );
    }
    const typeValues = line.replace(/^Type\: /, '');
    transactionState.type = typeValues;
  } else {
    // in this case it's line 5
    if (!line.startsWith('Amount: ')) {
      throw new Error('Expected amount to be something valid, but it was not.');
    }
    const amountValue = line.replace(/^Amount\: /, '');
    validateIsInteger(amountValue);
    const valueAsNumber = Number(amountValue);
    transactionState.amount = valueAsNumber;

    performTransaction(transactionState, transactionData);
  }

  incrementCounter();
};

const parseLine = ({
  data,
  incrementCounter,
  line,
  lineCounter,
  pairs,
  transactionData,
  transactionState,
}) => {
  if (lineCounter < NUMBER_OF_HEADER_LINES) {
    parseHeaders({ line, data, lineCounter, incrementCounter });
  } else {
    parseTransactions({
      line,
      data,
      lineCounter,
      pairs,
      transactionData,
      transactionState,
      incrementCounter,
    });
  }
};

const generateUniquePairs = (pairs) => {
  const seenSerializedPairs = new Set();

  return pairs.reduce((accumulator, pair) => {
    const { accountNumber, routingNumber } = pair;
    const serializedPair = `${accountNumber}#${routingNumber}`;

    if (!seenSerializedPairs.has(serializedPair)) {
      accumulator.push(pair);
      seenSerializedPairs.add(serializedPair);
    }

    return accumulator;
  }, []);
};

const fileParser = () => {
  const data = {};
  const transactionData = {};
  const transactionState = {
    originator: null,
    recipient: null,
    type: null,
    amount: null,
  };
  const pairs = [];

  let lineCounter = 0;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const incrementCounter = () => {
    lineCounter++;
  };

  return new Promise((resolve, reject) => {
    rl.on('line', (line) => {
      try {
        parseLine({
          data,
          incrementCounter,
          line,
          lineCounter,
          pairs,
          transactionData,
          transactionState,
        });
      } catch (e) {
        reject(e);
      }
    });

    rl.on('close', () => {
      data.accounts = [];
      const uniquePairs = generateUniquePairs(pairs);

      uniquePairs.forEach(({ accountNumber, routingNumber }) => {
        const routingData = transactionData[routingNumber];
        const accountData = routingData[accountNumber];
        const accountEntry = {
          routing_number: routingNumber,
          account_number: accountNumber,
          net_transactions: accountData.balance,
        };

        data.accounts.push(accountEntry);
      });

      resolve(data);
    });
  });
};

module.exports = fileParser;
