import { InternalPackRow } from './retrieve-packs';

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface Input extends InternalPackRow {
	readonly userId: string;
	readonly userName: string;
	readonly userMachineId: string;
}
