/* eslint-disable @typescript-eslint/no-use-before-define */
import { getConnectionProxy } from '@firestone-hs/aws-lambda-utils';
import { AllCardsService } from '@firestone-hs/reference-data';
import { ServerlessMysql } from 'serverless-mysql';
import SqlString from 'sqlstring';
import { Input } from './sqs-event';

let allCards: AllCardsService;

export default async (event, context): Promise<any> => {
	const events: readonly Input[] = (event.Records as any[])
		.map((event) => JSON.parse(event.body))
		.reduce((a, b) => a.concat(b), []);

	if (!allCards?.getCards()?.length) {
		allCards = new AllCardsService();
		await allCards.initializeCardsDb();
	}

	console.debug('processing', events.length, 'events');
	const mysql = await getConnectionProxy();
	for (const ev of events) {
		await processEvent(ev, mysql);
	}
	await mysql.end();

	const response = {
		statusCode: 200,
		isBase64Encoded: false,
		body: null,
	};
	return response;
};

const processEvent = async (packStat: Input, mysql: ServerlessMysql) => {
	const escape = SqlString.escape;
	if (packStat.cardsJson?.length) {
		// console.log('handling event with cardsJson', packStat.cardsJson);
		await mysql.query(
			`
				INSERT INTO pack_stat
				(creationDate, setId, boosterId, userId, userName, cardsJson)
				VALUES (?, ?, ?, ?, ?, ?)
			`,
			[
				packStat.creationDate,
				packStat.setId,
				packStat.boosterId,
				packStat.userId,
				packStat.userName,
				JSON.stringify(packStat.cardsJson),
			],
		);
	} else {
		// console.debug('handling event', packStat);
		await mysql.query(
			`
			INSERT INTO pack_stat 
			(
				card1Id, card1Rarity, card1Type, card1CurrencyAmount, card1MercenaryCardId, card1IsNew, card1IsSecondCopy,
				card2Id, card2Rarity, card2Type, card2CurrencyAmount, card2MercenaryCardId, card2IsNew, card2IsSecondCopy,
				card3Id, card3Rarity, card3Type, card3CurrencyAmount, card3MercenaryCardId, card3IsNew, card3IsSecondCopy,
				card4Id, card4Rarity, card4Type, card4CurrencyAmount, card4MercenaryCardId, card4IsNew, card4IsSecondCopy,
				card5Id, card5Rarity, card5Type, card5CurrencyAmount, card5MercenaryCardId, card5IsNew, card5IsSecondCopy,
				creationDate,
				setId,
				boosterId,
				userId, userMachineId,
				userName
			)
			VALUES
			(
				${escape(packStat.card1Id)}, ${escape(checkRarity(packStat.card1Id, packStat.card1Rarity))}, 
					${escape(packStat.card1Type)}, ${escape(packStat.card1CurrencyAmount)}, ${escape(packStat.card1MercenaryCardId)}, 
						${escape(packStat.card1IsNew)}, ${escape(packStat.card1IsSecondCopy)},
				${escape(packStat.card2Id)}, ${escape(checkRarity(packStat.card2Id, packStat.card2Rarity))}, 
					${escape(packStat.card2Type)}, ${escape(packStat.card2CurrencyAmount)}, ${escape(packStat.card2MercenaryCardId)},
						${escape(packStat.card2IsNew)}, ${escape(packStat.card2IsSecondCopy)},
				${escape(packStat.card3Id)}, ${escape(checkRarity(packStat.card3Id, packStat.card3Rarity))}, 
					${escape(packStat.card3Type)}, ${escape(packStat.card3CurrencyAmount)}, ${escape(packStat.card3MercenaryCardId)},
						${escape(packStat.card3IsNew)}, ${escape(packStat.card3IsSecondCopy)},
				${escape(packStat.card4Id)}, ${escape(checkRarity(packStat.card4Id, packStat.card4Rarity))}, 
					${escape(packStat.card4Type)}, ${escape(packStat.card4CurrencyAmount)}, ${escape(packStat.card4MercenaryCardId)},
						${escape(packStat.card4IsNew)}, ${escape(packStat.card4IsSecondCopy)},
				${escape(packStat.card5Id)}, ${escape(checkRarity(packStat.card5Id, packStat.card5Rarity))}, 
					${escape(packStat.card5Type)}, ${escape(packStat.card5CurrencyAmount)}, ${escape(packStat.card5MercenaryCardId)},
						${escape(packStat.card5IsNew)}, ${escape(packStat.card5IsSecondCopy)},
				${escape(packStat.creationDate)}, 
				${escape(packStat.setId)}, 
				${escape(packStat.boosterId)}, 
				${escape(packStat.userId)}, ${escape(packStat.userMachineId)}, 
				${escape(packStat.userName)}
			)
		`,
		);
	}
};

const checkRarity = (cardId: string, inputRarity: string): string => {
	return !inputRarity || inputRarity === 'free' ? allCards.getCard(cardId).rarity ?? inputRarity : inputRarity;
};
