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
     * @throw {Error} error about _AssertQ or amqp #sendToQueue
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
     * @return {Promise<Object|Error>} task - promise of task object
     * @return {Function} task.ack - Method to notify the mq server the task is done, remove the task from queue
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
                task.ack = () => this.Channel.ack(msg);
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
     * @throw {Error} about _AssertQ or the amqplib function #consume
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
                    err_handler(err);
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