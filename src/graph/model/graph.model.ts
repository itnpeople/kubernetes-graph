import * as d3Force		from "d3-force";

/** 
 * Topology 데이터 모델
*/
export namespace Tree {

	export class Tree {
		name:string
		kind:NodeKind
		children?:Array<Tree>
	}

	export enum NodeKind {
		USER = "user", GROUP = "group", ROLE = "role", CLUSTER_ROLE = "clusterrole", SERVICE_ACCOUNT = "serviceaccount", ROLEBINDING = "rolebinding", CLUSTER_ROLEBINDING = "clusterrolebinding", SECRET ="secret"
	}

}

/** 
 * Topology 데이터 모델
*/
export namespace Topology {

	export class Topology {
		public nodes:Node[] = [];
		public links:Link[] = [];
	}


	export class Node implements d3Force.SimulationNodeDatum {
		id:string
		name:string
		kind:NodeKind
		group:string;
		labels?:any
		index?: number
		x?: number
		y?: number
		vx?: number
		vy?: number
		fx?: number | null
		fy?: number | null
	}
	export class Link implements d3Force.SimulationNodeDatum {
		source:any
		target:any
		kind:NodeKind
		hidden:boolean=false
		x?: number
		y?: number
		vx?: number
		vy?: number
		fx?: number | null
		fy?: number | null
	}

	export enum NodeKind {
		SERVICE = "service", POD = "pod", NAMESPACE = "namespace", NODE = "node", CLUSTER = "cluster",
		USER = "user", GROUP = "group", ROLE = "role", CLUSTER_ROLE = "clusterrole", SERVICE_ACCOUNT = "serviceaccount", ROLEBINDING = "rolebinding", CLUSTER_ROLEBINDING = "clusterrolebinding", SECRET ="secret"
	}
}
