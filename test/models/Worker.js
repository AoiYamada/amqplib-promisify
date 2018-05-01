const chai = require('chai');
const assert = chai.assert;
const path = require('path');
const CWD = process.cwd();
const MODELS_PATH = './models/';

const amqplib = require('amqplib');
const Worker = require(path.join(CWD, MODELS_PATH, 'Worker'));

const URL = 'amqp://127.0.0.1';
const QUEUE = 'Cw0KBwMEAg0BCgEIBAENCw';
const TASK = { test: 'test msg' };
var connection;

describe('Worker', async() => {
    const workerPromise = getWorker();

    it('worker is a Worker', async() => {
        const worker = await workerPromise;
        assert(worker instanceof Worker, 'Confusing, worker is not worker?');
    });

    it('Put put a task to queue', async() => {
        try {
            const worker = await workerPromise;
            await worker.Put(QUEUE, TASK);
            assert(true);
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Get a task from queue', async() => {
        try {
            const worker = await workerPromise;
            const task = await worker.Get(QUEUE);
            assert(objCompare(task, TASK), `Tasks should equal, task: ${JSON.stringify(task)} while TASK:${JSON.stringify(TASK)}`);
        } catch (err) {
            assert(false, err.message);
        }
    });

    it('Put a lot tasks to queue, then consume all of them', async() => {
        try {
            const worker = await workerPromise;
            var taskNumber = 5;
            var counter = 0;
            for (let i = 0; i < taskNumber; i++) {
                await worker.Put(QUEUE, TASK);
            }
            await worker.Consume(QUEUE, task => counter++);
            assert(taskNumber === counter, `${counter} tasks are consumed but ${taskNumber} tasks left`);
        } catch (err) {
            assert(false, err.message);
        }
    });

    after(async() => {
        try {
            const worker = await workerPromise;
            await worker.Die();
            connection.close();
            assert(true);
        } catch (err) {
            assert(false, err.message);
        }
    });
});

async function getWorker() {
    return new Promise((resolve, reject) => {
        amqplib
            .connect(URL)
            .then(async conn => {
                connection = conn;
                const channel = await conn.createConfirmChannel();
                resolve(new Worker(channel));
            })
            .catch(reject);
    });
}

function objCompare(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}