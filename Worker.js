const amqplib = require('amqplib');

// private static cache of connections
const _connections = Object.create(null);

/**
 * https://www.npmjs.com/package/amqplib
 *
 */
class Worker {
    /**
     * @param {Channel} channel - amqplib Channel returned by createConfirmChannel
     *
     */
    constructor(channel) {
        this._channel = channel;
    }

    /**
     * Get a promise of Worker
     * @param {String} URL - mq server url
     * @return {Promise<Worker|Error>} Instance of Worker
     *
     */
    static async GetWorker(URL) {
        if (_connections[URL]) {
            const conn = _connections[URL];
            const channel = await conn.createConfirmChannel();
            return Promise.resolve(new Worker(channel));
        } else {
            return new Promise(async (resolve, reject) => {
                try {
                    const conn = await amqplib.connect(URL)
                    _connections[URL] = conn;
                    const channel = await conn.createConfirmChannel();
                    const worker = new Worker(channel);
                    resolve(worker);
                    conn.on('error', async err => {
                        delete _connections[URL];
                        console.log(`${URL} disconnected...`);

                        let retry = 7;
                        while(retry--) {
                            console.log('Reconnecting...', retry);
                            try {
                                const reborn_worker = await Worker.GetWorker(URL);
                                worker._channel = reborn_worker._channel;
                                retry = 0;
                                console.log('Success');
                            } catch(err) {
                                console.log('Fail');
                            }
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    });
                } catch (err) {
                    reject(err);
                }
            });
        }
    }

    /**
     * Close the connection of the URL
     * effects: All clients using the same connection will be effected
     * @param {String} URL - mq server url
     *
     */
    static async Kill(URL) {
        const conn = _connections[URL];
        const isClosed = await _connections[URL].close();
        delete _connections[URL];
        return isClosed;
    }

    /**
     * Kill all connections in _connections
     * effects: All clients will be effected
     *
     */
    static async KillAll() {
        const results = [];
        for (const [url, connection] of Object.entries(_connections)) {
            results.push(Worker.Kill(url));
        }
        return Promise.all(results);
    }

    /**
     * Put a task to the queue
     * @param {String} queue - queue name
     * @param {Object} payload - task contents
     * @throw {Error} error about _AssertQueue or amqp #sendToQueue
     *
     */
    async Put(queue, payload) {
        await this._AssertQueue(queue);
        await this._channel.sendToQueue(queue, new Buffer(JSON.stringify(payload)));
    }

    /**
     * Get a task from the queue
     * @param {String} queue - queue name
     * @param {Object} options - see Channel#get
     *                           http://www.squaremobius.net/amqp.node/channel_api.html#channel_get
     * @return {Promise<Object|Error>} task - promise of task object
     * @return {Function} task.ack - Method to notify the mq server the task is done, remove the task from queue
     * @throw {Error} No more message
     *
     */
    async Get(queue, options = {}) {
        await this._AssertQueue(queue);
        const msg = await this._channel.get(queue, options);
        if (msg) {
            const content = msg.content.toString();
            const task = JSON.parse(content);
            if (!options.noAck)
                task.ack = () => this._channel.ack(msg);
            return task;
        } else {
            throw new Error('No more message!');
        }
    }

    /**
     * Consume all task from the queue
     * @param {String} queue - queue name
     * @param {Object} options - see Channel#consume
     *                           http://www.squaremobius.net/amqp.node/channel_api.html#channel_consume
     * @param {Worker~Handler} handler - handle the task
     * @param {Worker~ErrHandler} err_handler - handle error throw by handler
     * @return {Promise<Object|Error>} promise of task object
     * @throw {Error} about _AssertQueue or the amqplib function #consume
     *
     */

    /**
     * @callback Worker~Handler
     * @param {Object} task - parsed task got from the message from queue
     * @throw {Error} 
     *
     */

    /**
     * @callback Worker~ErrHandler
     * @param {Error}
     *
     */
    async Consume(queue, handler, err_handler, options = {}) {
        await this._AssertQueue(queue);
        await this._channel.consume(
            queue,
            async msg => {
                try {
                    if (msg !== null) {
                        const content = msg.content.toString();
                        const task = JSON.parse(content);
                        await handler(task);
                        if (!options.noAck)
                            this._channel.ack(msg);
                    }
                } catch (err) {
                    err_handler(err);
                }
            },
            options
        );
    }

    /**
     * Private: A Ceremony before using a queue
     * @param {String} queue - queue name
     * @return {Promise<Null|Error>} 
     * @throw {Error} Channel is closed
     *
     */
    _AssertQueue(queue) {
        if (this._channel)
            return this._channel.assertQueue(queue);
        else
            throw new Error('Channel is closed.');
    }

    /**
     * Close the channel
     *
     */
    Die() {
        this._channel.close();
        delete this._channel;
    }
}

module.exports = {
    Worker,
}