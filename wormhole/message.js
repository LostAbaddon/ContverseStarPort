const crypto = require("crypto");

class Message {
	mid;
	sign;
	sender = '';
	stamp = 0;
	event = '';
	message = '';
	type = 0; // 0: 普通信息; 1: 广播信息; 2: 窄播信息
	target = '';
	#generated = false;

	generate (privKey) {
		if (this.#generated) return;
		this.#generated = true;
		this.stamp = this.stamp || Date.now();
		this.sender = this.sender || global.NodeConfig.node.id;
		var data = this.sender + '|' + this.stamp + '|' + this.event + '|' + this.type + '|' + this.target + '|' + JSON.stringify(this.message);
		const hash = crypto.createHash('sha256');
		hash.update(data);
		this.mid = hash.digest('base64');
		if (!privKey) return;
		data = this.mid + '|' + data;
		this.sign = crypto.sign('RSA-SHA256', Buffer.from(data, 'utf8'), privKey).toString('base64');
	}
	verify (pubkey) {
		var data = this.sender + '|' + this.stamp + '|' + this.event + '|' + this.type + '|' + this.target + '|' + JSON.stringify(this.message);
		const hash = crypto.createHash('sha256');
		hash.update(data);
		var mid = hash.digest('base64');
		if (mid !== this.mid) return false;
		if (!this.sign) return true;
		data = mid + '|' + data;
		var ok = false;
		try {
			ok = crypto.verify('RSA-SHA256', Buffer.from(data, 'utf8'), pubkey, Buffer.from(this.sign, 'base64'));
		}
		catch (err) {
			console.error('验证失败：' + err.message);
			ok = false;
		}
		return ok;
	}
	reset () {
		this.#generated = false;
	}
	copy () {
		var m = new Message();
		m.sender = this.sender;
		m.stamp = this.stamp;
		m.event = this.event;
		m.message = this.message;
		m.type = this.type;
		m.target = this.target;
		return m;
	}
}

module.exports = Message;