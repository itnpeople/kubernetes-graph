/**
* 설정정보
*/

export class Config {
	// -- DEFINE ---------
	global:{
		//graph:"topology"|"hierarchy"
		align: {
			vertical: "none"|"middle"
			horizontal: "none"|"center"
		}
		padding: { top:number, left:number, right:number, bottom:number }
		toolbar: {
			visible:boolean
			align: { horizontal:"none"|"left"|"right"|"center", vertical:"none"|"top"|"bottom"|"middle" }
			margin: { left:number, top:number, right:number, bottom:number} 
		}
		scale: {
			ratio:number, maxRatio:number, minRatio:number
		}
	}
	data?:any
	extends: {
		hierarchy: {
			scale: {
				minWidth:number, minHeight:number, maxWidth:number, maxHeight:number
			}
			group: {
				spacing:number
				title: {
					visible:boolean
					spacing:number
				}
				box: {
					padding: { top:number, left:number, right:number, bottom:number }
					background: { fill:string, opacity:number},
					border: { width:number, color?:string, dash?:string }
					tree : {
						spacing:number
						node : {
							height:number
						}
					}
				},
			}
		}
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
	}
	// -- 생성자 - Default 값 ---------
	constructor() {
		this.global = {
			//graph:"topology",
			align: {
				vertical: "none",
				horizontal: "none"	
			},
			toolbar: {
				visible: true,
				align: { horizontal:"right", vertical:"top" },
				margin: { top: 0, left: 0, right:0, bottom:0 }
			},
			padding: { top: 0, left: 0, right:0, bottom:0 },
			scale: { ratio: 1, maxRatio: 0, minRatio: 0 }
		};
		this.extends = {
			hierarchy: {
				scale: { minWidth: 0, minHeight: 0, maxWidth:0, maxHeight:0 },
				group: {
					spacing:25,											//group간 간격
					title: {
						visible: true,									//group title visible/hidden
						spacing: 10										//group title과 box 사이 간격
					},
					box: {
						border: { width: 1, color:"gray", dash: "2 2" },	//box border
						background: { fill:"silver", opacity:0.1 },			//box background
						padding: {top:10, left:5, right:5, bottom:10 },		//box padding
						tree : { 
							spacing:15,									//트리간 간격
							node : { height: 30 }						//노드 높이
						}
					},
				},
			},
			topology: {
				tick: { skip:10 },
				collision: { radius:60 },
				simulation: { alphaDecay:0.006, onEnd: undefined }
			}
		}
	}
}
