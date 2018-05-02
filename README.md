# amqplib-promisify
A simplified and promisified class for using amqplib.


## Installation
```bash
npm i git+https://github.com/AoiYamada/amqplib-promisify --save
```

## Usage
```javascript
const AMPQ = require('amqplib-promisify');

// Singleton, declare once in the global scope
global.ampq = new AMPQ();

const SERVER = 'amqp://127.0.0.1';
const QUEUE = 'Cw0KBwMEAg0BCgEIBAENCw';

(async() => {
    const worker = await ampq.GetWorker(SERVER);

    // Producer: Seed a task to queue
    const seed = {
        data1: 1,
        data2: 22,
        data3: 333,
    };
    await worker.Put(QUEUE, seed);

    // Consumer: Retrive a task from queue
    const task = await worker.Get(QUEUE);
    console.log(task);
    /* it should like:
    {
        data1: 1,
        data2: 22,
        data3: 333,
        ack: [Function] // Only ocurr when option.noAck is false/null/undefined
    }
     */

    // ack the mq server the task is done, remove it from queue
    task.ack();

    // Consume all tasks by handler function
    const taskNumber = 5;
    let counter = 0;
    for (let i = 0; i < taskNumber; i++) {
        await worker.Put(QUEUE, seed);
    }
    await worker.Consume(
        QUEUE, 
        task => counter++,
        err => console.log(err)
    );
    console.log(taskNumber === counter); // true

    // Close too fast will stop the acknowledgement, tasks will stuck in the queue.
    setTimeout(() => {
        // *Close specific connection(globally):
        // ampq.Kill(SERVER);

        // *Close all connections(globally):
        ampq.KillAll();
    }, 1000);

})();

```


## Test
```bash
npm run test
```