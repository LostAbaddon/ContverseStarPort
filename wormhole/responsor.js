/**
 *	返回格式：
 *	request:	被回复信息的 mid
 *	data:		回复内容
 **/

const keyUtil = require('./keyUtils');
const RequestList = _('Wormhole.Requests'); // 每项参数：res、符合要求的回复数、现有回复列表、超时时长、发送时间、超时Timer
const Message = require('./message');

const getUserContent = (node, hash) => new Promise(async res => {
	var path;
	try {
		path = await IPFS.downloadFolder(node, hash);
	}
	catch (err) {
		console.error('获取新内容失败：' + err.message);
		return res(false);
	}
	console.log('获取节点内容：' + path);
	global.ContentUpdated(node, hash, path);
	res(true);
});

const Responsor = {};
Responsor.shakehand = (sender, msg) => {
	var hash = msg.hash;
	keyUtil.setPubKey(sender, msg.key);

	var card = global.Wormhole.getIDCard();
	if (!!card) {
		card = card.copy();
		card.event = 'StarPortUpdated';
		card.generate();
		card = JSON.stringify(card);
		global.Wormhole.sendToNode(sender, card);
	}

	if (global.NodeManager.didSubscribed(sender)) getUserContent(sender, hash);
	return true;
};
Responsor.StarPortUpdated = (sender, msg) => {
	var hash = msg.hash;
	keyUtil.setPubKey(sender, msg.key);
	if (global.NodeManager.didSubscribed(sender)) getUserContent(sender, hash);
	return true;
};
Responsor.NewContent = (sender, hash, msg) => new Promise(async res => {
	console.log('节点 (' + sender + ') 发布新内容: ' + hash);
	if (global.NodeManager.didSubscribed(sender)) {
		await global.IPFS.downloadFile(hash);
		console.log('已预取内容 ' + hash);
	}
	else {
		let dist = keyUtil.getDistance(keyUtil.localPosition, keyUtil.getPosition(hash));
		if (dist < keyUtil.limitDistance) {
			await global.IPFS.downloadFile(hash);
			console.log('已预取内容 ' + hash);
		}
	}
	global.Wormhole.broadcast(msg);
	res(false);
});
Responsor.requestPublicKey = (sender, target, msg) => {
	if (target !== global.NodeConfig.node.id) return false;

	var reply = {
		request: msg.mid,
		data: global.Keys.card
	};
	reply.event = 'reply';
	Wormhole.narrowcast(sender, 'reply', reply);
	return true;
};
Responsor.reply = (sender, msg) => {
	var id = msg.request;
	var item = RequestList.get(id);
	if (!item) return false;
	item[2][sender] = msg.data;
	var now = Date.now();
	if (now - item[4] > item[3] || Object.keys(item[2]).length >= item[1]) {
		if (!!item[5]) clearTimeout(item[5]);
		item[0]([item[2], null]);
		RequestList.delete(id);
	}
	return true;
};

module.exports = Responsor;