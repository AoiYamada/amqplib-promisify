const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const should = chai.should();
const path = require('path');
const CWD = process.cwd();
const { Worker } = require(path.join(CWD, 'Worker'));

const SERVER = 'amqp://10.10.10.213';
const QUEUE = 'Cw0KBwMEAg0BCgEIBAENCw';
const TASK = { test: 'test msg' };

var worker;

describe('Worker', () => {
    it('GetWorker should resolve a worker', async() => {
        try {
            worker = await Worker.GetWorker(SERVER);
            expect(worker).to.be.an.instanceof(Worker);
        } catch (err) {
            should.not.exist(err.message || err);
        }
    });

    it('Put put a task to queue', async() => {
        try {
            await worker.Put(QUEUE, TASK);
        } catch (err) {
            should.not.exist(err.message || err);
        }
    });

    it('Get a task from queue', async() => {
        try {
            const task = await worker.Get(QUEUE);
            task.ack();
            expect(objCompare(task, TASK)).equal(true);

            // for test disconnect server
            // await Promise.all([worker.Get(QUEUE), new Promise(resolve => setTimeout(resolve, 8000))]);
        } catch (err) {
            should.not.exist(err.message || err);
        }
    });

    it('Put a lot tasks to queue, then consume all of them', async() => {
        try {
            const taskNumber = ~~(10 * Math.random()) + 1;
            let counter = 0;
            const tasks = [];
            for (let i = 0; i < taskNumber; i++) {
                tasks.push(worker.Put(QUEUE, TASK));
            }
            await Promise.all(tasks);
            await worker.Consume(QUEUE, task => counter++);
            expect(taskNumber).equal(counter);
        } catch (err) {
            should.not.exist(err.message || err);
        }
    });

    after(async() => {
        try {
            await Worker.KillAll();
        } catch (err) {
            should.not.exist(err.message || err);
        }
    });
});

function objCompare(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}