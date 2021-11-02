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

	const [userIds, userNames] = await retrieveFromUserMapping(userInput.userId, userInput.userName, mysql);
	const userIdCriteria = userIds.length === 0 ? '' : `userId IN (${userIds.map(userId => escape(userId)).join(',')})`;
	const userNameCriteria =
		userNames.length === 0
			? ''
			: userIdCriteria.length
			? `OR userName IN (${userNames.map(userName => escape(userName)).join(',')})`
			: `userName IN (${userNames.map(userName => escape(userName)).join(',')})`;
	const query = `
		SELECT * FROM pack_stat
		WHERE (
			${userIdCriteria}
			${userNameCriteria}
		)
		ORDER BY id DESC;
	`;
	const dbResults: readonly InternalPackRow[] =
		userIds.length === 0 && userNames.length === 0 ? [] : await mysql.query(query);
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

const retrieveFromUserMapping = async (
	userId: string,
	userName: string,
	mysql,
): Promise<[readonly string[], readonly string[]]> => {
	const escape = SqlString.escape;
	const query = `
		SELECT * FROM user_mapping
		WHERE userId = ${escape(userId)}
		OR userName = ${escape(userName)}
	`;
	const dbResults: readonly any[] = await mysql.query(query);
	const allUserIds: string[] = dbResults
		.map(result => result.userId)
		.filter(result => result)
		.filter(result => result != 'null')
		.filter(result => result?.length);
	const allUserNames: string[] = dbResults
		.map(result => result.userName)
		.filter(result => result)
		.filter(result => result != 'null')
		.filter(result => result?.length);
	return [[...new Set(allUserIds)], [...new Set(allUserNames)]];
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
