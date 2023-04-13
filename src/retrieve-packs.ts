import { BoosterType } from '@firestone-hs/reference-data';
import SqlString from 'sqlstring';
import { gzipSync } from 'zlib';
import { getConnection } from './db/rds';

export default async (event): Promise<any> => {
	const mysql = await getConnection();
	const escape = SqlString.escape;

	const userInput = JSON.parse(event.body);
	if (!userInput) {
		console.warn('trying to get match stats without input, returning');
		return;
	}

	const userIds = await getAllUserIds(userInput.userId, userInput.userName, mysql);
	if (!userIds?.length) {
		return {
			statusCode: 200,
			isBase64Encoded: false,
			body: JSON.stringify({ results: [] }),
		};
	}

	const query = `
		SELECT * FROM pack_stat
		WHERE userId IN (${escape(userIds)})
		ORDER BY id DESC;
	`;
	const dbResults: readonly InternalPackRow[] = await mysql.query(query);
	await mysql.end();

	const results: readonly PackResult[] = dbResults.map(row => buildPackResult(row)).filter(pack => pack);

	const stringResults = JSON.stringify({ results });
	const gzippedResults = gzipSync(stringResults).toString('base64');
	const response = {
		statusCode: 200,
		isBase64Encoded: true,
		body: gzippedResults,
		headers: {
			'Content-Type': 'text/html',
			'Content-Encoding': 'gzip',
		},
	};
	return response;
};

const buildPackResult = (row: InternalPackRow): PackResult => {
	const result = {
		id: row.id,
		creationDate: row.creationDate,
		setId: row.setId,
		boosterId: row.boosterId,
		cards: buildCards(row),
	};
	return result.cards.every(
		card =>
			card.mercenaryCardId != null || (card.cardId != null && card.cardRarity != null && card.cardType != null),
	)
		? result
		: null;
};

const buildCards = (row: InternalPackRow): readonly CardPackResult[] => {
	const result: CardPackResult[] = [];
	for (let i = 1; i <= 5; i++) {
		result.push({
			cardId: row[`card${i}Id`]?.toUpperCase(),
			cardRarity: row[`card${i}Rarity`],
			cardType: row[`card${i}Type`]?.toUpperCase(),
			currencyAmount: row[`card${i}CurrencyAmount`],
			mercenaryCardId: row[`card${i}MercenaryCardId`]?.toUpperCase(),
		});
	}
	return result;
};

const getAllUserIds = async (userId: string, userName: string, mysql): Promise<readonly string[]> => {
	const escape = SqlString.escape;
	const userSelectQuery = `
			SELECT DISTINCT userId FROM user_mapping
			INNER JOIN (
				SELECT DISTINCT username FROM user_mapping
				WHERE 
					(username = ${escape(userName)} OR username = ${escape(userId)} OR userId = ${escape(userId)})
					AND username IS NOT NULL
					AND username != ''
					AND username != 'null'
					AND userId != ''
					AND userId IS NOT NULL
					AND userId != 'null'
			) AS x ON x.username = user_mapping.username
			UNION ALL SELECT ${escape(userId)}
		`;
	// console.log('running query', userSelectQuery);
	const userIds: any[] = await mysql.query(userSelectQuery);
	// console.log('query over', userIds);
	return userIds.map(result => result.userId);
};

export interface PackResult {
	readonly id: number;
	readonly creationDate: number;
	readonly setId: string;
	readonly boosterId: BoosterType;
	readonly cards: readonly CardPackResult[];
}

export interface CardPackResult {
	readonly cardId: string;
	readonly cardRarity: 'common' | 'rare' | 'epic' | 'legendary';
	readonly cardType: 'NORMAL' | 'GOLDEN';
	readonly currencyAmount: number;
	readonly mercenaryCardId: string;
}

export interface InternalPackRow {
	readonly id: number;
	readonly creationDate: number;
	readonly setId: string;
	readonly boosterId: BoosterType;
	readonly card1Id: string;
	readonly card1Rarity: 'common' | 'rare' | 'epic' | 'legendary';
	readonly card1Type: 'normal' | 'golden';
	readonly card1CurrencyAmount: number;
	readonly card1MercenaryCardId: string;
	readonly card2Id: string;
	readonly card2Rarity: 'common' | 'rare' | 'epic' | 'legendary';
	readonly card2Type: 'normal' | 'golden';
	readonly card2CurrencyAmount: number;
	readonly card2MercenaryCardId: string;
	readonly card3Id: string;
	readonly card3Rarity: 'common' | 'rare' | 'epic' | 'legendary';
	readonly card3Type: 'normal' | 'golden';
	readonly card3CurrencyAmount: number;
	readonly card3MercenaryCardId: string;
	readonly card4Id: string;
	readonly card4Rarity: 'common' | 'rare' | 'epic' | 'legendary';
	readonly card4Type: 'normal' | 'golden';
	readonly card4CurrencyAmount: number;
	readonly card4MercenaryCardId: string;
	readonly card5Id: string;
	readonly card5Rarity: 'common' | 'rare' | 'epic' | 'legendary';
	readonly card5Type: 'normal' | 'golden';
	readonly card5CurrencyAmount: number;
	readonly card5MercenaryCardId: string;
}
