const chai = require('chai');
const assert = chai.assert;
const path = require('path');
const CWD = process.cwd();
const MODELS_PATH = './models/';

const BibAmqp = require(path.join(CWD, 'Core'));
const Worker = require(path.join(CWD, MODELS_PATH, 'Worker'));

global.bib_amqp = new BibAmqp();

const SERVER = 'amqp://127.0.0.1';
// const QUEUE = 'Cw0KBwMEAg0BCgEIBAENCw';
// const TASK = { test: 'test msg' };

describe('Core', () => {
    it('GetWorker should resolve a worker', async() => {
        try {
            const worker = await bib_amqp.GetWorker(SERVER);
            assert(worker instanceof Worker, 'worker is not Worker, it is confusing...');
        } catch(err) {
        	assert(false, err);
        }
    });

    after(async () => {
        try {
            await bib_amqp.KillAll();
            assert(true);
        } catch(err) {
            assert(false, err.message);
        }
    });
});

function objCompare(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}