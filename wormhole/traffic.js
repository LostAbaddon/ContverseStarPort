class UserTraffic {
	id = '';
	conns = {};
	sockets = [];
	weight = 0;
	count = 0;
	total = 0;
	incoming = 0;
	outcoming = 0;
	#rate = 0;
	#changed = false;
	constructor (hash) {
		this.id = hash;
	}
	prepare (host, port) {
		var conn = this.getConn(host);
		conn.getConn(port);
	}
	getConn (host) {
		var conn = this.conns[host];
		if (!!conn) return conn;
		conn = new NodeTraffic(host);
		this.conns[host] = conn;
		return conn;
	}
	record (host, port, success, bytes, isIn) {
		if (!success) bytes = 0;
		this.#changed = true;
		this.count ++;
		this.total += bytes;
		if (success) {
			this.weight ++;
		}
		else {
			this.weight --;
		}
		if (isIn) {
			this.incoming += bytes;
		}
		else {
			this.outcoming += bytes;
		}
		var conn = this.getConn(host);
		conn.record(port, success, bytes, isIn);
	}
	getAll () {
		var list = [];
		Object.keys(this.conns).forEach(host => {
			var conn = this.conns[host];
			conn.getAll().forEach(item => list.push(item));
		});
		return list;
	}
	choose (connected=false) {
		var list = connected ? this.sockets : this.getAll();
		if (!list || list.length === 0) return undefined;
		var max = list[0].weight, result = [], lans = [], locals = [];
		list.forEach(item => {
			if (item.weight > max) {
				max = item.weight;
				result = [];
				lans = [];
				locals = [];
			}
			else if (item.weight < max) return;
			if (item.type === 1) lans.push(item);
			else if (item.type === 2) locals.push(item);
			else if (item.type === 3) result.push(item);
			else {
				result.push(item);
				locals.push(item);
				lans.push(item);
			}
		});
		var len = locals.length;
		if (len > 0) {
			len = Math.floor(Math.random() * len);
			return locals[len];
		}
		len = lans.length;
		if (len > 0) {
			len = Math.floor(Math.random() * len);
			return lans[len];
		}
		len = result.length;
		len = Math.floor(Math.random() * len);
		return result[len];
	}
	get rate () {
		if (this.#changed) {
			let a = 0, b = 0;
			if (this.total > 0) a = (this.incoming - this.outcoming) / this.total;
			if (this.count > 0) b = this.weight / this.count;
			this.#rate = a * (1 + b) / 2;
			this.#changed = false;
		}
		return this.#rate;
	}
}
class NodeTraffic {
	conns = {};
	host = '';
	type = 0; // 0: 未定；1：局域网；2：本机；3：远端
	weight = 0;
	count = 0;
	total = 0;
	incoming = 0;
	outcoming = 0;
	#rate = 0;
	#changed = false;
	constructor (host) {
		this.host = host;
		if (!!host.match(/^(0\.|127\.|::|0:0:0:0:0:0:0:)/i)) {
			this.type = 2;
		}
		else if (!!host.match(/^(192\.|fe\d\d:)/i)) {
			this.type = 1;
		}
		else {
			this.type = 3;
		}
	}
	getConn (port) {
		var conn = this.conns[port];
		if (!!conn) return conn;
		conn = new ConnTraffic(this.host, port);
		conn.type = this.type;
		this.conns[port] = conn;
		return conn;
	}
	record (port, success, bytes, isIn) {
		this.#changed = true;
		this.count ++;
		this.total += bytes;
		if (success) {
			this.weight ++;
		}
		else {
			this.weight --;
		}
		if (isIn) {
			this.incoming += bytes;
		}
		else {
			this.outcoming += bytes;
		}
		var conn = this.getConn(port);
		conn.record(success, bytes, isIn);
	}
	getAll () {
		var list = [], count = this.weight / Object.keys(this.conns).length;
		Object.keys(this.conns).forEach(port => {
			var conn = this.conns[port];
			var item = {};
			item.host = this.host;
			item.type = this.type;
			item.port = conn.port;
			item.weight = conn.weight + count;
			item.count = conn.count;
			item.total = conn.total;
			item.incoming = conn.incoming;
			item.outcoming = conn.outcoming;
			item.rate = conn.rate;
			list.push(item);
		});
		return list;
	}
	get rate () {
		if (this.#changed) {
			let a = 0, b = 0;
			if (this.total > 0) a = (this.incoming - this.outcoming) / this.total;
			if (this.count > 0) b = this.weight / this.count;
			this.#rate = a * (1 + b) / 2;
			this.#changed = false;
		}
		return this.#rate;
	}
}
class ConnTraffic {
	host = '';
	type = 0;
	port = 0;
	socket = null;
	weight = 0;
	count = 0;
	total = 0;
	incoming = 0;
	outcoming = 0;
	last = 0;
	#rate = 0;
	#changed = false;
	constructor (host, port) {
		this.host = host;
		this.port = port;
	}
	record (success, bytes, isIn) {
		if (success) this.last = Date.now();
		this.#changed = true;
		this.count ++;
		this.total += bytes;
		if (success) {
			this.weight ++;
		}
		else {
			if (this.weight < 0) this.weight --;
			else this.weight = Math.floor(this.weight / 2) - 1;
		}
		if (isIn) {
			this.incoming += bytes;
		}
		else {
			this.outcoming += bytes;
		}
	}
	get rate () {
		if (this.#changed) {
			let a = 0, b = 0;
			if (this.total > 0) a = (this.incoming - this.outcoming) / this.total;
			if (this.count > 0) b = this.weight / this.count;
			this.#rate = a * (1 + b) / 2;
			this.#changed = false;
		}
		return this.#rate;
	}
}

module.exports = {
	UserTraffic,
	NodeTraffic,
	ConnTraffic
};