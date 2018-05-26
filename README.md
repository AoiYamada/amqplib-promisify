# amqplib-promisify
A simplified and promisified class for using amqplib.
https://www.npmjs.com/package/amqplib

## Installation
```bash
npm i git+https://github.com/AoiYamada/amqplib-promisify --save
```

## Usage
```javascript
const { Worker } = require('amqplib-promisify');

const SERVER = 'amqp://127.0.0.1';
const QUEUE = 'Cw0KBwMEAg0BCgEIBAENCw';

(async() => {
    const worker = await Worker.GetWorker(SERVER);

    // Producer: Seed a task to queue
    const seed = {
        data1: 12,
        data2: 223,
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
        ack: [Function] // ack function only occur when option.noAck of the worker.Get is null/undefined/false
    }
     */
    
    // call this to acknowledge the mq server to remove the task when the task is finished
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
        // Worker.Kill(SERVER);

        // *Close all connections(globally):
        Worker.KillAll();
    }, 1000);

})();

```

## Test
```bash
npm run test
```
