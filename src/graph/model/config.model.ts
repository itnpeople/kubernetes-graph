/**
* 설정정보
*/

export class Config {
	// -- DEFINE ---------
	global:{
		graph:"topology"|"mesh"
		align: {
			vertical: "none"|"middle"
			horizonal: "none"|"center"
		}
		padding: {top:number, left:number},
		health: {
			error: { ratio: number },
			warn: { ratio: number }
		}
	}
	data?:any
	topology: {
		tick: {
			skip:number
		}
		collision: {
			radius:number
		},
		simulation: {
			alphaDecay:number,
			onEnd: any
		}
	}
	mesh:Mesh = new Mesh();
	// -- 생성자 - Default 값 ---------
	constructor() {
		this.global = {
			graph:"mesh",
			align: {
				vertical: "none",
				horizonal: "none"	
			},
			padding: {
				top: 20,
				left: 20
			},
			health: {
				error: { ratio: 0.2 },
				warn: { ratio: 0.001 }
			}
		};
		this.data;
		this.topology = {
			tick: {skip: 20},
			collision: {radius: 60},
			simulation: {alphaDecay: 0.06, onEnd: undefined}
		};
	}
}


export class Mesh {
	// -- DEFINE ---------
	type:"app"|"service"|"versionedApp"|"workload"
	group: {
		distance: { y: number }	//그룹 element 간 margin
		padding: { top:number, right:number, bottom: number, left: number }	//그룹 element padding
		label: { show:boolean; }
	}
	node : {
		distance: { x:number, y: number }
		r: number		//아이콘 반지름
		label: { show:boolean; }
	}
	edge : {
		traffic: {
			animation: {
				show:boolean,
				duration:number
			}
		}
		label: { type:"none"|"requestsSecond"|"requestsPercent"|"responseTime" }
	}
	events: {
		node: {
			mouseover?:(caller:SVGElement, d:any) => void
			mouseout?:(caller:SVGElement) => void
			selected?:(caller:SVGElement, d:any) => void
		}
		edge: {
			mouseover?:(caller:SVGElement, d:any) => void
			mouseout?:(caller:SVGElement) => void
			selected?:(caller:SVGElement, d:any) => void
		},
		unselected?:() => void
	}
	alert: {
		show:boolean
		error: {
			animation: {
				node:boolean
				edge:boolean
			},
			label: {
				show:boolean
			}

		}
	}	
	// -- 생성자 - Default 값 ---------
	constructor() {
		this.type = "versionedApp";
		this.group = {
			distance: { y: 50 },
			padding: { top: 10, right:10, bottom: 10, left: 10 },	//그룹 element padding
			label: {show:true}
		};
		this.node = {
			distance: { x:80, y: 20 },	//그룹내 노드간 마진 - 가로(horizontal margin)/세로(vertical)
			r: 15,		//아이콘 반지름
			label: {show:true},
		};
		this.edge = {
			traffic: {
				animation: {show:true, duration:1200}
			},
			label: { type: "responseTime"}
		};
		this.events = { node: {}, edge: {} };
		// error, warn 알림표시 기준값
		this.alert = { 
			show: true,
			error: {
				animation: { node: false, edge: false},
				label: { show: true },
			}
		}

	}

}
