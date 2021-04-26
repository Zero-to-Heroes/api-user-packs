/* eslint-disable @typescript-eslint/no-use-before-define */
import { ServerlessMysql } from 'serverless-mysql';
import SqlString from 'sqlstring';
import { getConnection } from './db/rds';
import { Input } from './sqs-event';

export default async (event, context): Promise<any> => {
	console.log('received event', event);
	const events: readonly Input[] = (event.Records as any[])
		.map(event => JSON.parse(event.body))
		.reduce((a, b) => a.concat(b), []);

	const mysql = await getConnection();
	for (const ev of events) {
		console.log('processing event', ev);
		await processEvent(ev, mysql);
	}
	await mysql.end();

	const response = {
		statusCode: 200,
		isBase64Encoded: false,
		body: null,
	};
	console.log('sending back success reponse');
	return response;
};

const processEvent = async (packStat: Input, mysql: ServerlessMysql) => {
	const escape = SqlString.escape;
	console.debug('handling event', packStat);
	await mysql.query(
		`
			INSERT INTO pack_stat 
			(
				card1Id, card1Rarity, card1Type, 
				card2Id, card2Rarity, card2Type,
				card3Id, card3Rarity, card3Type,
				card4Id, card4Rarity, card4Type,
				card5Id, card5Rarity, card5Type,
				creationDate,
				setId,
				boosterId,
				userId, userMachineId,
				userName
			)
			VALUES
			(
				${escape(packStat.card1Id)}, ${escape(packStat.card1Rarity)}, ${escape(packStat.card1Type)},
				${escape(packStat.card2Id)}, ${escape(packStat.card2Rarity)}, ${escape(packStat.card2Type)},
				${escape(packStat.card3Id)}, ${escape(packStat.card3Rarity)}, ${escape(packStat.card3Type)},
				${escape(packStat.card4Id)}, ${escape(packStat.card4Rarity)}, ${escape(packStat.card4Type)},
				${escape(packStat.card5Id)}, ${escape(packStat.card5Rarity)}, ${escape(packStat.card5Type)},
				${escape(packStat.creationDate)}, 
				${escape(packStat.setId)}, 
				${escape(packStat.boosterId)}, 
				${escape(packStat.userId)}, ${escape(packStat.userMachineId)}, 
				${escape(packStat.userName)}
			)
		`,
	);
};
