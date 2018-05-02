const amqplib = require('amqplib');
const Worker = require('./models/Worker');

/**
 * Singleton Class for storing amqp connections
 * https://www.npmjs.com/package/amqplib
 * @property {Object<Promise<Worker>>} Workers - encapsulated class of logics about amqp channel
 * @property {Connection} Connections - amqp connection
 *
 */
module.exports = class Core {
    /**
     * Create Singleton for global access
     *
     */
    constructor() {
        this.Workers = Object.create(null);
        this.Connections = Object.create(null);
    }

    /**
     * Get a promise of Worker
     * @param {String} URL - mq server url
     * @return {Promise<Worker|Error>} Instance of Worker
     *
     */
    GetWorker(URL) {
        return this.Workers[URL] = this.Workers[URL] || new Promise((resolve, reject) => {
            amqplib
                .connect(URL)
                .then(async conn => {
                    this.Connections[URL] = conn;
                    const channel = await conn.createConfirmChannel();
                    resolve(new Worker(channel));
                })
                .catch(reject);
        });
    }

    /**
     * Close the channel of the worker of the URL
     * effects: the worker in this.Workers[URL] will be killed and removed
     * @param {String} URL - mq server url
     *
     */
    async Kill(URL) {
        const worker = await this.Workers[URL];
        await worker.Die();
        this.Connections[URL].close();
        delete this.Workers[URL];
        delete this.Connections[URL];
    }

    /**
     * Kill all workers in this.Workers
     * effects: all workers will be killed and removed from this.Workers
     *
     */
    async KillAll() {
        for (const [url, promiseWorker] of Object.entries(this.Workers)) {
            this.Kill(url);
        }
    }
}