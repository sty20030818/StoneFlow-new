import { createHash, generateKeyPairSync, sign as signBytes } from 'node:crypto'

function createTestSigner(keyIdHex: string) {
	const keyId = Buffer.from(keyIdHex, 'hex')
	const { privateKey, publicKey } = generateKeyPairSync('ed25519')
	const spki = Buffer.from(publicKey.export({ format: 'der', type: 'spki' }))
	const publicKeyBytes = spki.subarray(-32)
	const encodedPublicKey = Buffer.from(
		`untrusted comment: minisign public key\n${Buffer.concat([
			Buffer.from('Ed'),
			keyId,
			publicKeyBytes,
		]).toString('base64')}\n`,
	).toString('base64')

	return {
		publicKey: encodedPublicKey,
		sign(fileName: string, bytes: Uint8Array) {
			const artifactSignature = signBytes(
				null,
				createHash('blake2b512').update(bytes).digest(),
				privateKey,
			)
			const trustedComment = `timestamp:0\tfile:${fileName}`
			const globalSignature = signBytes(
				null,
				Buffer.concat([artifactSignature, Buffer.from(trustedComment)]),
				privateKey,
			)
			return Buffer.from(
				[
					'untrusted comment: signature from tauri secret key',
					Buffer.concat([Buffer.from('ED'), keyId, artifactSignature]).toString('base64'),
					`trusted comment: ${trustedComment}`,
					globalSignature.toString('base64'),
				].join('\n'),
			).toString('base64')
		},
	}
}

export const TEST_UPDATER_SIGNER = createTestSigner('0011223344556677')
export const OTHER_UPDATER_SIGNER = createTestSigner('8899aabbccddeeff')
