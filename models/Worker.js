/**
 * Abstract the logic of amqp channel
 * https://www.npmjs.com/package/amqplib
 * @property {Channel} Channel - amqplib Channel
 *                               https://www.npmjs.com/package/amqplib#promise-api-example
 * 
 */
module.exports = class Worker {
    /**
     * @param {Channel} channel - amqplib Channel returned by createConfirmChannel
     */
    constructor(channel) {
        this.Channel = channel;
    }

    /**
     * Put a task to the queue
     * @param {String} queue - queue name
     * @param {Object} payload - task contents
     * @throw {Error}
     *
     */
    async Put(queue, payload) {
        await this._AssertQ(queue);
        await this.Channel.sendToQueue(queue, new Buffer(JSON.stringify(payload)));
    }

    /**
     * Get a task from the queue
     * @param {String} queue - queue name
     * @param {Object} options - see Channel#get
     *                           http://www.squaremobius.net/amqp.node/channel_api.html#channel_get
     * @return {Promise<Object|Error>} promise of task object
     * @throw {Error}
     *
     */
    async Get(queue, options = {}) {
        await this._AssertQ(queue);
        const msg = await this.Channel.get(queue, options);
        if (msg) {
            const content = msg.content.toString();
            const task = JSON.parse(content);
            if (!options.noAck)
                this.Channel.ack(msg);
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
     * @param {Worker~Handler} handler - queue name
     * @return {Promise<Object|Error>} promise of task object
     * @throw {Error}
     *
     */

    /**
     * @callback Worker~Handler
     * @param {Object} task - parsed task got from the message from queue
     *
     */
    async Consume(queue, handler, options = {}) {
        await this._AssertQ(queue);
        await this.Channel.consume(
            queue,
            async msg => {
                try {
                    if (msg !== null) {
                        const content = msg.content.toString();
                        const task = JSON.parse(content);
                        await handler(task);
                        if (!options.noAck)
                            this.Channel.ack(msg);
                    }
                } catch (err) {
                    // add error hander?
                }
            },
            options
        );
    }

    /**
     * Private: A Ceremony before using a queue
     * @param {String} queue - queue name
     *
     */
    _AssertQ(queue) {
        return this.Channel.assertQueue(queue);
    }

    /**
     * Clean this.Channel, then the connection is ready to close
     *
     */
    Die() {
        this.Channel.close();
        delete this.Channel;
    }
}