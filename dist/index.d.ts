/** Types of the `terraworld-ai` npm package. Specs use Terraria names; see llms.txt in the package. */

export interface SpecIssue {
	severity: "error" | "warning";
	/** Index of the op, counted from 0 in the order written. */
	op?: number;
	message: string;
}

/** The JSON form of a structure spec. The text form is parsed into the same shape. */
export interface StructureSpec {
	format?: "terraworld-structure-spec";
	version?: 1;
	name?: string;
	description?: string;
	width: number;
	height: number;
	legend?: Record<string, string | Record<string, unknown>>;
	ops: Array<{ op: "rect" | "clear" | "line" | "roof" | "object" | "grid" } & Record<string, unknown>>;
}

export interface SpecResult {
	ok: boolean;
	issues: SpecIssue[];
	width: number;
	height: number;
	objectCount: number;
	/** One character per cell, with a legend. */
	ascii: string;
	/** The .twpack bytes, or null when the spec has errors. */
	twpack: Uint8Array | null;
}

/** Parses, checks and builds a spec given as text (text form or JSON) or as an object. */
export function buildSpec(source: string | StructureSpec): Promise<SpecResult>;
/** Draws an existing .twpack as text. */
export function renderTwpack(bytes: Uint8Array): Promise<string>;
/** Parses the text form or JSON. Throws on syntax errors. */
export function parseStructureSpec(source: string): StructureSpec;
/** A link that opens the spec in TerraWorld Structure Studio. */
export function createSpecLink(specText: string, base?: string): string;
/** The spec text carried by a Structure Studio link's hash, or null. */
export function readSpecFromHash(hash: string): string | null;
/** Loads the Terraria name index (blocks, walls, objects, items). Cached after the first call. */
export function loadNames(): Promise<{
	search(query: string, kind?: "block" | "wall" | "object", limit?: number): Array<{
		kind: "block" | "wall" | "object"; name: string; variety?: string; size?: [number, number]; anchor?: string; facing?: string; id: number;
	}>;
}>;
