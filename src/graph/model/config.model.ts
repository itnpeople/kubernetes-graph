/**
* 설정정보
*/

export class Config {
	// -- DEFINE ---------
	global:{
		graph:"topology"|"hierarchy"
		align: {
			vertical: "none"|"middle"
			horizonal: "none"|"center"
		}
		padding: {top:number, left:number, right:number, bottom:number}
	}
	data?:any
	extends: {
		hierarchy: {
			group: {
				spacing:number
				title: {
					spacing:number
				}
				box: {
					padding: {top:number, left:number, right:number, bottom:number }
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
			graph:"topology",
			align: {
				vertical: "none",
				horizonal: "none"	
			},
			padding: { top: 0, left: 0, right:0, bottom:0}
		};
		this.extends = {
			hierarchy: {
				group: {
					spacing:25,											//group간 간격
					title: {
						spacing: 10										//group title과 box 사이 간격
					},
					box: {
						padding: {top:10, left:5, right:5, bottom:10},	//box padding
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
