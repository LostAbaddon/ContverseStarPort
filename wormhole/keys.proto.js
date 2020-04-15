'use strict'

module.exports = `enum KeyType {
  RSA = 0;
  Ed25519 = 1;
  Secp256k1 = 2;
}
message Key {
  required KeyType Type = 1;
  required bytes Data = 2;
}`