"uss strict"
import * as d3					from "d3";
import * as d3Select			from "d3-selection";
import {HierarchyModel as model}	from "@/components/graph/model/graph.model";
import {Config}					from "@/components/graph/model/config.model";
import {UI, WH}				from "@/components/graph/utils/ui";
import {GraphBase}				from "@/components/graph/graph.base";
import "@/components/graph/graph.hierarchy.css";

/**
 * Topology 그래프 랜더러
 */
export class HierarchyGraph extends GraphBase {
	/**
	 * (abstract) 랜더링
	 * 
	 * @param outlineEl 외곽 g element (zoom & drag 용)
	 * @param bounds 랜더링 영역 크기 (x,y,height,width)
	 * @param conf 데이터 & 옵션
	 */
	public populate(outlineEl:d3Select.Selection<SVGGElement,any,SVGElement,any>, bounds:WH, conf:Config) {
		
		if(!conf.data) return;

		// Set min,max width,height options
		if(conf.extends.hierarchy.scale.minWidth > 0 && bounds.width < conf.extends.hierarchy.scale.minWidth*conf.global.scale.ratio)  bounds.width = conf.extends.hierarchy.scale.minWidth;
		if(conf.extends.hierarchy.scale.maxWidth > 0 && bounds.width > conf.extends.hierarchy.scale.maxWidth*conf.global.scale.ratio)  bounds.width = conf.extends.hierarchy.scale.maxWidth;
		if(conf.extends.hierarchy.scale.minHeight > 0 && bounds.height < conf.extends.hierarchy.scale.minHeight*conf.global.scale.ratio)  bounds.height = conf.extends.hierarchy.scale.minHeight;
		if(conf.extends.hierarchy.scale.maxHeight > 0 && bounds.height > conf.extends.hierarchy.scale.maxHeight*conf.global.scale.ratio)  bounds.height = conf.extends.hierarchy.scale.maxHeight;

		// svg > defs
		if(this.svg.select("defs").size() == 0) this.svg.append("defs").call(HierarchyGraph.renderDefs, conf);

		// data 가공
		let data:Array<model.Node> = [];
		Object.keys(conf.data).forEach( (k:string)=> {
			let d:Array<model.Node> = conf.data[k]
			const root = d.reduce((acc, cur:model.Node) => {
				if(cur.ownerReference && cur.ownerReference.kind && cur.ownerReference.name) {
					d.reduce((a:model.Node, c:model.Node) => {
						if(c.kind == cur.ownerReference!.kind && c.name == cur.ownerReference!.name) {
							if(!c.children) c.children=[]
							c.children.push(cur)
						}
						return a
					}, new model.Node());
				} else {
					if(!cur.children) cur.children = [];
					acc.children.push(cur)
				}
				return acc;
			}, new model.Node(k))
			data.push(root)
		});
		// rendering groups
		// svg > g.graph > g.outline > g.outlineWrap > g.group
		//		> text
		//      > g.boxWrap > g.box > g.tree
		let gH = 0;
		const padding = conf.extends.hierarchy.group.box.padding;
		const width:number = bounds.width - (conf.extends.hierarchy.group.box.border.width*2) //line width
		const treeWidth:number = width - (padding.left + padding.right);
		const nodeHeight:number = conf.extends.hierarchy.group.box.tree.node.height;

		data.forEach((d:model.Node)=> {

			const g:d3.Selection<SVGGElement, any, SVGElement, any> = outlineEl.append("g").attr("class","group");
			let t;
			if(conf.extends.hierarchy.group.title.visible) {
				t = g.append("text").text(d.name).attr("transform", (d:any,i:number,els:SVGTextElement[]|d3.ArrayLike<SVGTextElement>)=> {
					return `translate(0,${els[i].getBBox().y * -1})`
				})
			}

			if (d.children.length > 0) {
				let h = t ? t.node()!.getBBox().height + conf.extends.hierarchy.group.title.spacing:0;
				UI.appendBox(g, (box: d3.Selection<SVGGElement, any, SVGElement, any>)=> {
					d.children.forEach((c:model.Node)=> {
						let gg = box.append("g").attr("class","tree")
							.call(HierarchyGraph.renderHierarchy, c, treeWidth, nodeHeight)
							.attr("transform", (d:any,i:number,els: Array<SVGGElement>|d3.ArrayLike<SVGGElement>)=> {
								return `translate(0,${h-els[i].getBBox().y})`
							});
						h += gg.node()!.getBBox().height + conf.extends.hierarchy.group.box.tree.spacing;	// multi-root 간 간격
					});
				}, width, padding, conf.extends.hierarchy.group.box.background, conf.extends.hierarchy.group.box.border);
			}

			// + move Y
			g.attr("transform", `translate(0,${gH})`)
			gH += g.node()!.getBBox().height + conf.extends.hierarchy.group.spacing;
		});

		// toolbar aline default 값 정의 -  "none"(사용자 지정 X)이면
		if(conf.global.toolbar.align.horizontal == "none") conf.global.toolbar.align.horizontal = "right";
		if(conf.global.toolbar.align.vertical == "none") conf.global.toolbar.align.vertical = "top";

	}


	/**
	 * Hierarchy(tree) 랜더링
	 * 
	 * @param data  랜더링 데이터
	 * @param treeWidth 너비 - 각 노드 너비 계산
	*/
	private static renderHierarchy(parentEl:d3Select.Selection<SVGGElement,any,SVGElement,any>, data:model.Node, treeWidth:number, nodeHeight:number) {

		const nodeWidth = treeWidth/ 3
		const layoaut = d3.tree().nodeSize([nodeHeight, nodeWidth]);

		let d:d3.HierarchyNode<model.Node> = d3.hierarchy(data, (d:any) => d.children);	//  assigns the data to a hierarchy using parent-child relationships
		let nodes:d3.HierarchyPointNode<model.Node> = <d3.HierarchyPointNode<model.Node>>layoaut(d) // maps the node data to the tree layout

		nodes.each( (nd:d3.HierarchyPointNode<model.Node>)=> {
			if(nd.data.depth > -1) {
				nd.y =  nodeWidth * nd.data.depth
			} else {
				nd.y =  nodeWidth * nd.depth;
			}
		})

		const icoWH:number = nodeHeight - 2	//30-6,	40-2

		// adds the links between the nodes
		parentEl.selectAll(".link")
			.data( nodes.descendants().slice(1))
		.enter().append("path")
			.attr("class", "link")
			.attr("d", (d:d3.HierarchyPointNode<model.Node>) => `M${d.y},${d.x}C${(d.y + d.parent!.y) / 2},${d.x} ${(d.y + d.parent!.y) / 2},${d.parent!.x} ${d.parent!.y},${d.parent!.x}`);

		// adds each node as a group
		let node = parentEl.selectAll(".node")
			.data(nodes.descendants())
		.enter().append("g")
			.attr("class", "node")
			.attr("transform", (d:d3.HierarchyPointNode<model.Node>) => `translate(${d.y},${d.x-12})`);

		// adds the icon to the node
		node.append("use")
			.attr("class","ico")
			.attr("y","-6")
			.attr("height",icoWH).attr("width",icoWH)
			.attr("xlink:href", (d:d3.HierarchyPointNode<model.Node>)=>`#ac_ic_${(d.data.kind || "").toLowerCase()}`)
		
		const nd = node.append("text")
			.attr("dy", (d) => d.children ? icoWH/4 : icoWH/2)
			.attr("x", icoWH+2.5)
			.text((d:d3.HierarchyPointNode<model.Node>) =>d.data.name);

		nd.each( (d:d3.HierarchyPointNode<model.Node>,i:number,els:SVGTextElement[]|d3.ArrayLike<SVGTextElement>) =>{
			UI.ellipsisText(els[i], nodeWidth)
		});

	}



	/**
	 * defs 정의
	 * 
	 * @param defsEl def 엘리먼트
	 */
	private static renderDefs(defsEl:d3.Selection<SVGDefsElement, any, SVGElement, any>) {

		// https://github.com/kubernetes/community/tree/master/icons
		defsEl.append("symbol").attr("id", "ac_ic_namespace")
			.attr("width", "18.035334mm").attr("height", "17.500378mm").attr("viewBox", "0 0 18.035334 17.500378")
			.html(`<g transform="translate(-0.99262638,-1.174181)">
<g transform="matrix(1.0148887,0,0,1.0148887,16.902146,-2.698726)">
	<path d="m -6.8492015,4.2724668 a 1.1191255,1.1099671 0 0 0 -0.4288818,0.1085303 l -5.8524037,2.7963394 a 1.1191255,1.1099671 0 0 0 -0.605524,0.7529759 l -1.443828,6.2812846 a 1.1191255,1.1099671 0 0 0 0.151943,0.851028 1.1191255,1.1099671 0 0 0 0.06362,0.08832 l 4.0508,5.036555 a 1.1191255,1.1099671 0 0 0 0.874979,0.417654 l 6.4961011,-0.0015 a 1.1191255,1.1099671 0 0 0 0.8749788,-0.416906 L 1.3818872,15.149453 A 1.1191255,1.1099671 0 0 0 1.5981986,14.210104 L 0.15212657,7.9288154 A 1.1191255,1.1099671 0 0 0 -0.45339794,7.1758396 L -6.3065496,4.3809971 A 1.1191255,1.1099671 0 0 0 -6.8492015,4.2724668 Z" style="fill:#326ce5;fill-opacity:1;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" />
	<path d="M -6.8523435,3.8176372 A 1.1814304,1.171762 0 0 0 -7.3044284,3.932904 l -6.1787426,2.9512758 a 1.1814304,1.171762 0 0 0 -0.639206,0.794891 l -1.523915,6.6308282 a 1.1814304,1.171762 0 0 0 0.160175,0.89893 1.1814304,1.171762 0 0 0 0.06736,0.09281 l 4.276094,5.317236 a 1.1814304,1.171762 0 0 0 0.92363,0.440858 l 6.8576188,-0.0015 a 1.1814304,1.171762 0 0 0 0.9236308,-0.44011 l 4.2745966,-5.317985 a 1.1814304,1.171762 0 0 0 0.228288,-0.990993 L 0.53894439,7.6775738 A 1.1814304,1.171762 0 0 0 -0.10026101,6.8834313 L -6.2790037,3.9321555 A 1.1814304,1.171762 0 0 0 -6.8523435,3.8176372 Z m 0.00299,0.4550789 a 1.1191255,1.1099671 0 0 1 0.5426517,0.1085303 l 5.85315169,2.7948425 A 1.1191255,1.1099671 0 0 1 0.15197811,7.9290648 L 1.598051,14.21035 a 1.1191255,1.1099671 0 0 1 -0.2163123,0.939348 l -4.0493032,5.037304 a 1.1191255,1.1099671 0 0 1 -0.8749789,0.416906 l -6.4961006,0.0015 a 1.1191255,1.1099671 0 0 1 -0.874979,-0.417652 l -4.0508,-5.036554 a 1.1191255,1.1099671 0 0 1 -0.06362,-0.08832 1.1191255,1.1099671 0 0 1 -0.151942,-0.851028 l 1.443827,-6.2812853 a 1.1191255,1.1099671 0 0 1 0.605524,-0.7529758 l 5.8524036,-2.7963395 a 1.1191255,1.1099671 0 0 1 0.4288819,-0.1085303 z" style="color:#000000;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:medium;line-height:normal;font-family:Sans;-inkscape-font-specification:Sans;text-indent:0;text-align:start;text-decoration:none;text-decoration-line:none;letter-spacing:normal;word-spacing:normal;text-transform:none;writing-mode:lr-tb;direction:ltr;baseline-shift:baseline;text-anchor:start;display:inline;overflow:visible;visibility:visible;fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;marker:none;enable-background:accumulate"/>
</g>
<text y="16.811775" x="9.9717083" style="font-style:normal;font-weight:normal;font-size:10.58333302px;line-height:6.61458349px;font-family:Sans;letter-spacing:0px;word-spacing:0px;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1">
	<tspan y="16.811775" x="9.9717083" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.82222223px;font-family:Arial;-inkscape-font-specification:'Arial, Normal';text-align:center;writing-mode:lr-tb;text-anchor:middle;fill:#ffffff;fill-opacity:1;stroke-width:0.26458332px">ns</tspan>
</text>
<rect y="6.3689628" x="6.1734986" height="6.6900792" width="7.6735892" style="opacity:1;fill:none;fill-opacity:1;fill-rule:nonzero;stroke:#ffffff;stroke-width:0.40000001;stroke-linecap:butt;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:0.80000001, 0.4;stroke-dashoffset:3.44000006;stroke-opacity:1" />
</g>`)


		defsEl.append("symbol").attr("id", "ac_ic_deployment")
			.attr("width", "18.035334mm").attr("height", "17.500378mm").attr("viewBox", "0 0 18.035334 17.500378")
			.html(`<g transform="translate(-0.99262638,-1.174181)">
<g transform="matrix(1.0148887,0,0,1.0148887,16.902146,-2.698726)">
	<path d="m -6.8492015,4.2724668 a 1.1191255,1.1099671 0 0 0 -0.4288818,0.1085303 l -5.8524037,2.7963394 a 1.1191255,1.1099671 0 0 0 -0.605524,0.7529759 l -1.443828,6.2812846 a 1.1191255,1.1099671 0 0 0 0.151943,0.851028 1.1191255,1.1099671 0 0 0 0.06362,0.08832 l 4.0508,5.036555 a 1.1191255,1.1099671 0 0 0 0.874979,0.417654 l 6.4961011,-0.0015 a 1.1191255,1.1099671 0 0 0 0.8749788,-0.416906 L 1.3818872,15.149453 A 1.1191255,1.1099671 0 0 0 1.5981986,14.210104 L 0.15212657,7.9288154 A 1.1191255,1.1099671 0 0 0 -0.45339794,7.1758396 L -6.3065496,4.3809971 A 1.1191255,1.1099671 0 0 0 -6.8492015,4.2724668 Z" style="fill:#326ce5;fill-opacity:1;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" />
	<path d="M -6.8523435,3.8176372 A 1.1814304,1.171762 0 0 0 -7.3044284,3.932904 l -6.1787426,2.9512758 a 1.1814304,1.171762 0 0 0 -0.639206,0.794891 l -1.523915,6.6308282 a 1.1814304,1.171762 0 0 0 0.160175,0.89893 1.1814304,1.171762 0 0 0 0.06736,0.09281 l 4.276094,5.317236 a 1.1814304,1.171762 0 0 0 0.92363,0.440858 l 6.8576188,-0.0015 a 1.1814304,1.171762 0 0 0 0.9236308,-0.44011 l 4.2745966,-5.317985 a 1.1814304,1.171762 0 0 0 0.228288,-0.990993 L 0.53894439,7.6775738 A 1.1814304,1.171762 0 0 0 -0.10026101,6.8834313 L -6.2790037,3.9321555 A 1.1814304,1.171762 0 0 0 -6.8523435,3.8176372 Z m 0.00299,0.4550789 a 1.1191255,1.1099671 0 0 1 0.5426517,0.1085303 l 5.85315169,2.7948425 A 1.1191255,1.1099671 0 0 1 0.15197811,7.9290648 L 1.598051,14.21035 a 1.1191255,1.1099671 0 0 1 -0.2163123,0.939348 l -4.0493032,5.037304 a 1.1191255,1.1099671 0 0 1 -0.8749789,0.416906 l -6.4961006,0.0015 a 1.1191255,1.1099671 0 0 1 -0.874979,-0.417652 l -4.0508,-5.036554 a 1.1191255,1.1099671 0 0 1 -0.06362,-0.08832 1.1191255,1.1099671 0 0 1 -0.151942,-0.851028 l 1.443827,-6.2812853 a 1.1191255,1.1099671 0 0 1 0.605524,-0.7529758 l 5.8524036,-2.7963395 a 1.1191255,1.1099671 0 0 1 0.4288819,-0.1085303 z" style="color:#000000;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:medium;line-height:normal;font-family:Sans;-inkscape-font-specification:Sans;text-indent:0;text-align:start;text-decoration:none;text-decoration-line:none;letter-spacing:normal;word-spacing:normal;text-transform:none;writing-mode:lr-tb;direction:ltr;baseline-shift:baseline;text-anchor:start;display:inline;overflow:visible;visibility:visible;fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;marker:none;enable-background:accumulate" />
</g>
<text y="16.811775" x="9.9744644" style="font-style:normal;font-weight:normal;font-size:10.58333302px;line-height:6.61458349px;font-family:Sans;letter-spacing:0px;word-spacing:0px;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1">
	<tspan y="16.811775" x="9.9744644" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.82222223px;font-family:Arial;-inkscape-font-specification:'Arial, Normal';text-align:center;writing-mode:lr-tb;text-anchor:middle;fill:#ffffff;fill-opacity:1;stroke-width:0.26458332px">deploy</tspan>
</text>
<g transform="translate(-0.65385546,0)">
	<path style="fill:#ffffff;fill-rule:evenodd;stroke:none;stroke-width:0.26458332;stroke-linecap:square;stroke-miterlimit:10" d="m 10.225062,13.731632 0,0 C 7.7824218,13.847177 5.7050116,11.968386 5.5753417,9.5264634 5.4456516,7.0845405 7.3124018,4.9962905 9.7535318,4.8524795 c 2.4411202,-0.143811 4.5401412,1.71081 4.6980812,4.1510682 l -1.757081,0.1137208 c -0.0954,-1.473818 -1.36311,-2.593935 -2.8374602,-2.50708 -1.47434,0.08686 -2.60178,1.3480761 -2.52346,2.8228991 0.0783,1.4748224 1.333,2.6095384 2.8082502,2.5397534 z"/>
	<path style="fill:#ffffff;fill-rule:evenodd;stroke:none;stroke-width:0.26458332;stroke-linecap:square;stroke-miterlimit:10" d="m 11.135574,9.0088015 1.39745,3.4205085 3.2263,-3.4205085 z" />
</g>
</g>
`)

		defsEl.append("symbol").attr("id", "ac_ic_daemonset")
			.attr("width", "18.035334mm").attr("height", "17.500378mm").attr("viewBox", "0 0 18.035334 17.500378")
			.html(`<g transform="translate(-0.99262638,-1.174181)">
<g transform="matrix(1.0148887,0,0,1.0148887,16.902146,-2.698726)">
	<path d="m -6.8492015,4.2724668 a 1.1191255,1.1099671 0 0 0 -0.4288818,0.1085303 l -5.8524037,2.7963394 a 1.1191255,1.1099671 0 0 0 -0.605524,0.7529759 l -1.443828,6.2812846 a 1.1191255,1.1099671 0 0 0 0.151943,0.851028 1.1191255,1.1099671 0 0 0 0.06362,0.08832 l 4.0508,5.036555 a 1.1191255,1.1099671 0 0 0 0.874979,0.417654 l 6.4961011,-0.0015 a 1.1191255,1.1099671 0 0 0 0.8749788,-0.416906 L 1.3818872,15.149453 A 1.1191255,1.1099671 0 0 0 1.5981986,14.210104 L 0.15212657,7.9288154 A 1.1191255,1.1099671 0 0 0 -0.45339794,7.1758396 L -6.3065496,4.3809971 A 1.1191255,1.1099671 0 0 0 -6.8492015,4.2724668 Z" style="fill:#326ce5;fill-opacity:1;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" />
	<path d="M -6.8523435,3.8176372 A 1.1814304,1.171762 0 0 0 -7.3044284,3.932904 l -6.1787426,2.9512758 a 1.1814304,1.171762 0 0 0 -0.639206,0.794891 l -1.523915,6.6308282 a 1.1814304,1.171762 0 0 0 0.160175,0.89893 1.1814304,1.171762 0 0 0 0.06736,0.09281 l 4.276094,5.317236 a 1.1814304,1.171762 0 0 0 0.92363,0.440858 l 6.8576188,-0.0015 a 1.1814304,1.171762 0 0 0 0.9236308,-0.44011 l 4.2745966,-5.317985 a 1.1814304,1.171762 0 0 0 0.228288,-0.990993 L 0.53894439,7.6775738 A 1.1814304,1.171762 0 0 0 -0.10026101,6.8834313 L -6.2790037,3.9321555 A 1.1814304,1.171762 0 0 0 -6.8523435,3.8176372 Z m 0.00299,0.4550789 a 1.1191255,1.1099671 0 0 1 0.5426517,0.1085303 l 5.85315169,2.7948425 A 1.1191255,1.1099671 0 0 1 0.15197811,7.9290648 L 1.598051,14.21035 a 1.1191255,1.1099671 0 0 1 -0.2163123,0.939348 l -4.0493032,5.037304 a 1.1191255,1.1099671 0 0 1 -0.8749789,0.416906 l -6.4961006,0.0015 a 1.1191255,1.1099671 0 0 1 -0.874979,-0.417652 l -4.0508,-5.036554 a 1.1191255,1.1099671 0 0 1 -0.06362,-0.08832 1.1191255,1.1099671 0 0 1 -0.151942,-0.851028 l 1.443827,-6.2812853 a 1.1191255,1.1099671 0 0 1 0.605524,-0.7529758 l 5.8524036,-2.7963395 a 1.1191255,1.1099671 0 0 1 0.4288819,-0.1085303 z" style="color:#000000;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:medium;line-height:normal;font-family:Sans;-inkscape-font-specification:Sans;text-indent:0;text-align:start;text-decoration:none;text-decoration-line:none;letter-spacing:normal;word-spacing:normal;text-transform:none;writing-mode:lr-tb;direction:ltr;baseline-shift:baseline;text-anchor:start;display:inline;overflow:visible;visibility:visible;fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;marker:none;enable-background:accumulate" />
</g>
<text y="16.811775" x="10.016495" style="font-style:normal;font-weight:normal;font-size:10.58333302px;line-height:6.61458349px;font-family:Sans;letter-spacing:0px;word-spacing:0px;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1">
	<tspan y="16.811775" x="10.016495" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.82222223px;font-family:Arial;-inkscape-font-specification:'Arial, Normal';text-align:center;writing-mode:lr-tb;text-anchor:middle;fill:#ffffff;fill-opacity:1;stroke-width:0.26458332px">ds</tspan>
</text>
<g transform="translate(0.58627835,0)">
	<path d="m 7.708299,5.2827748 6.524989,0 0,4.5833348 -6.524989,0 z" style="fill:none;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.52914584;stroke-linecap:square;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:1.58743756, 1.58743756;stroke-dashoffset:3.66698074;stroke-opacity:1" />
	<path d="m 4.350169,13.606752 7.074559,0" style="fill:none;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.61833036;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" />
	<path d="m 6.169549,6.6940855 6.524989,0 0,4.5833355 -6.524989,0 z" style="fill:#326ce5;fill-opacity:1;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.52914584;stroke-linecap:square;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:1.58743756, 1.58743756;stroke-dashoffset:3.87863898;stroke-opacity:1" />
	<path d="m 4.630799,8.1053983 6.524999,0 0,4.5833347 -6.524999,0 z" style="fill:none;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.52916664;stroke-linecap:butt;stroke-linejoin:round;stroke-miterlimit:10;stroke-opacity:1" />
	<path d="m 4.5865192,8.1226661 6.5250018,0 0,4.5833339 -6.5250018,0 z" style="fill:#ffffff;fill-rule:evenodd;stroke:none;stroke-width:0.26458332;stroke-linecap:square;stroke-miterlimit:10" />
</g>
</g>`)

		defsEl.append("symbol").attr("id", "ac_ic_replicaset")
			.attr("width", "18.035334mm").attr("height", "17.500378mm").attr("viewBox", "0 0 18.035334 17.500378")
			.html(`<g transform="translate(-0.99262638,-1.174181)">
<g transform="matrix(1.0148887,0,0,1.0148887,16.902146,-2.698726)">
	<path d="m -6.8492015,4.2724668 a 1.1191255,1.1099671 0 0 0 -0.4288818,0.1085303 l -5.8524037,2.7963394 a 1.1191255,1.1099671 0 0 0 -0.605524,0.7529759 l -1.443828,6.2812846 a 1.1191255,1.1099671 0 0 0 0.151943,0.851028 1.1191255,1.1099671 0 0 0 0.06362,0.08832 l 4.0508,5.036555 a 1.1191255,1.1099671 0 0 0 0.874979,0.417654 l 6.4961011,-0.0015 a 1.1191255,1.1099671 0 0 0 0.8749788,-0.416906 L 1.3818872,15.149453 A 1.1191255,1.1099671 0 0 0 1.5981986,14.210104 L 0.15212657,7.9288154 A 1.1191255,1.1099671 0 0 0 -0.45339794,7.1758396 L -6.3065496,4.3809971 A 1.1191255,1.1099671 0 0 0 -6.8492015,4.2724668 Z" style="fill:#326ce5;fill-opacity:1;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" />
	<path d="M -6.8523435,3.8176372 A 1.1814304,1.171762 0 0 0 -7.3044284,3.932904 l -6.1787426,2.9512758 a 1.1814304,1.171762 0 0 0 -0.639206,0.794891 l -1.523915,6.6308282 a 1.1814304,1.171762 0 0 0 0.160175,0.89893 1.1814304,1.171762 0 0 0 0.06736,0.09281 l 4.276094,5.317236 a 1.1814304,1.171762 0 0 0 0.92363,0.440858 l 6.8576188,-0.0015 a 1.1814304,1.171762 0 0 0 0.9236308,-0.44011 l 4.2745966,-5.317985 a 1.1814304,1.171762 0 0 0 0.228288,-0.990993 L 0.53894439,7.6775738 A 1.1814304,1.171762 0 0 0 -0.10026101,6.8834313 L -6.2790037,3.9321555 A 1.1814304,1.171762 0 0 0 -6.8523435,3.8176372 Z m 0.00299,0.4550789 a 1.1191255,1.1099671 0 0 1 0.5426517,0.1085303 l 5.85315169,2.7948425 A 1.1191255,1.1099671 0 0 1 0.15197811,7.9290648 L 1.598051,14.21035 a 1.1191255,1.1099671 0 0 1 -0.2163123,0.939348 l -4.0493032,5.037304 a 1.1191255,1.1099671 0 0 1 -0.8749789,0.416906 l -6.4961006,0.0015 a 1.1191255,1.1099671 0 0 1 -0.874979,-0.417652 l -4.0508,-5.036554 a 1.1191255,1.1099671 0 0 1 -0.06362,-0.08832 1.1191255,1.1099671 0 0 1 -0.151942,-0.851028 l 1.443827,-6.2812853 a 1.1191255,1.1099671 0 0 1 0.605524,-0.7529758 l 5.8524036,-2.7963395 a 1.1191255,1.1099671 0 0 1 0.4288819,-0.1085303 z" style="color:#000000;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:medium;line-height:normal;font-family:Sans;-inkscape-font-specification:Sans;text-indent:0;text-align:start;text-decoration:none;text-decoration-line:none;letter-spacing:normal;word-spacing:normal;text-transform:none;writing-mode:lr-tb;direction:ltr;baseline-shift:baseline;text-anchor:start;display:inline;overflow:visible;visibility:visible;fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;marker:none;enable-background:accumulate" />
</g>
<text x="9.9730864" y="16.811775" style="font-style:normal;font-weight:normal;font-size:10.58333302px;line-height:6.61458349px;font-family:Sans;letter-spacing:0px;word-spacing:0px;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1">
	<tspan x="9.9730864" y="16.811775" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.82222223px;font-family:Arial;-inkscape-font-specification:'Arial, Normal';text-align:center;writing-mode:lr-tb;text-anchor:middle;fill:#ffffff;fill-opacity:1;stroke-width:0.26458332px">rs</tspan>
</text>
<g transform="translate(0.16298107,0)">
	<path d="m 8.123609,5.5524084 6.52499,0 0,4.5833346 -6.52499,0 z" style="fill:#326ce5;fill-opacity:1;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.52899998;stroke-linecap:square;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:1.58700001, 1.58700001;stroke-dashoffset:3.66597009;stroke-opacity:1" />
	<path d="m 6.5848588,6.9637194 6.5249902,0 0,4.5833346 -6.5249902,0 z" style="fill:#326ce5;fill-opacity:1;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.52914584;stroke-linecap:square;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:1.58743756, 1.58743756;stroke-dashoffset:3.87863898;stroke-opacity:1" />
	<path d="m 5.0461088,8.3750314 6.5250002,0 0,4.5833346 -6.5250002,0 z" style="fill:#ffffff;fill-rule:evenodd;stroke:none;stroke-width:0.26458332;stroke-linecap:square;stroke-miterlimit:10" />
	<path d="m 5.0461088,8.3750314 6.5250002,0 0,4.5833346 -6.5250002,0 z" style="fill:none;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.52916664;stroke-linecap:butt;stroke-linejoin:round;stroke-miterlimit:10;stroke-opacity:1" />
</g>
</g>`)


		defsEl.append("symbol").attr("id", "ac_ic_pod")
			.attr("width", "18.035334mm").attr("height", "17.500378mm").attr("viewBox", "0 0 18.035334 17.500378")
			.html(`<g transform="translate(-0.99262638,-1.174181)">
<g transform="matrix(1.0148887,0,0,1.0148887,16.902146,-2.698726)">
	<path d="m -6.8492015,4.2724668 a 1.1191255,1.1099671 0 0 0 -0.4288818,0.1085303 l -5.8524037,2.7963394 a 1.1191255,1.1099671 0 0 0 -0.605524,0.7529759 l -1.443828,6.2812846 a 1.1191255,1.1099671 0 0 0 0.151943,0.851028 1.1191255,1.1099671 0 0 0 0.06362,0.08832 l 4.0508,5.036555 a 1.1191255,1.1099671 0 0 0 0.874979,0.417654 l 6.4961011,-0.0015 a 1.1191255,1.1099671 0 0 0 0.8749788,-0.416906 L 1.3818872,15.149453 A 1.1191255,1.1099671 0 0 0 1.5981986,14.210104 L 0.15212657,7.9288154 A 1.1191255,1.1099671 0 0 0 -0.45339794,7.1758396 L -6.3065496,4.3809971 A 1.1191255,1.1099671 0 0 0 -6.8492015,4.2724668 Z" style="fill:#326ce5;fill-opacity:1;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" />
	<path d="M -6.8523435,3.8176372 A 1.1814304,1.171762 0 0 0 -7.3044284,3.932904 l -6.1787426,2.9512758 a 1.1814304,1.171762 0 0 0 -0.639206,0.794891 l -1.523915,6.6308282 a 1.1814304,1.171762 0 0 0 0.160175,0.89893 1.1814304,1.171762 0 0 0 0.06736,0.09281 l 4.276094,5.317236 a 1.1814304,1.171762 0 0 0 0.92363,0.440858 l 6.8576188,-0.0015 a 1.1814304,1.171762 0 0 0 0.9236308,-0.44011 l 4.2745966,-5.317985 a 1.1814304,1.171762 0 0 0 0.228288,-0.990993 L 0.53894439,7.6775738 A 1.1814304,1.171762 0 0 0 -0.10026101,6.8834313 L -6.2790037,3.9321555 A 1.1814304,1.171762 0 0 0 -6.8523435,3.8176372 Z m 0.00299,0.4550789 a 1.1191255,1.1099671 0 0 1 0.5426517,0.1085303 l 5.85315169,2.7948425 A 1.1191255,1.1099671 0 0 1 0.15197811,7.9290648 L 1.598051,14.21035 a 1.1191255,1.1099671 0 0 1 -0.2163123,0.939348 l -4.0493032,5.037304 a 1.1191255,1.1099671 0 0 1 -0.8749789,0.416906 l -6.4961006,0.0015 a 1.1191255,1.1099671 0 0 1 -0.874979,-0.417652 l -4.0508,-5.036554 a 1.1191255,1.1099671 0 0 1 -0.06362,-0.08832 1.1191255,1.1099671 0 0 1 -0.151942,-0.851028 l 1.443827,-6.2812853 a 1.1191255,1.1099671 0 0 1 0.605524,-0.7529758 l 5.8524036,-2.7963395 a 1.1191255,1.1099671 0 0 1 0.4288819,-0.1085303 z" style="color:#000000;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:medium;line-height:normal;font-family:Sans;-inkscape-font-specification:Sans;text-indent:0;text-align:start;text-decoration:none;text-decoration-line:none;letter-spacing:normal;word-spacing:normal;text-transform:none;writing-mode:lr-tb;direction:ltr;baseline-shift:baseline;text-anchor:start;display:inline;overflow:visible;visibility:visible;fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;marker:none;enable-background:accumulate" />
</g>
<text x="10.017183" y="16.811775" style="font-style:normal;font-weight:normal;font-size:10.58333302px;line-height:6.61458349px;font-family:Sans;letter-spacing:0px;word-spacing:0px;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1">
	<tspan x="10.017183" y="16.811775" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.82222223px;font-family:Arial;-inkscape-font-specification:'Arial, Normal';text-align:center;writing-mode:lr-tb;text-anchor:middle;fill:#ffffff;fill-opacity:1;stroke-width:0.26458332px">pod</tspan>
</text>
<g transform="translate(0.12766661,0)">
	<path d="M 6.2617914,7.036086 9.8826317,5.986087 13.503462,7.036086 9.8826317,8.086087 Z" style="fill:#ffffff;fill-rule:evenodd;stroke:none;stroke-width:0.26458332;stroke-linecap:square;stroke-miterlimit:10" />
	<path d="m 6.2617914,7.43817 0,3.852778 3.3736103,1.868749 0.0167,-4.713193 z" style="fill:#ffffff;fill-rule:evenodd;stroke:none;stroke-width:0.26458332;stroke-linecap:square;stroke-miterlimit:10" />
	<path d="m 13.503462,7.43817 0,3.852778 -3.37361,1.868749 -0.0167,-4.713193 z" style="fill:#ffffff;fill-rule:evenodd;stroke:none;stroke-width:0.26458332;stroke-linecap:square;stroke-miterlimit:10" />
</g>
</g>`)
		defsEl.append("symbol").attr("id", "ac_ic_node")
			.attr("width", "18.035334mm").attr("height", "17.500378mm").attr("viewBox", "0 0 18.035334 17.500378")
			.html(`<g transform="translate(-0.99262638,-1.174181)">
<g
	transform="matrix(1.0148887,0,0,1.0148887,16.902146,-2.698726)">
	<path d="m -6.8492015,4.2724668 a 1.1191255,1.1099671 0 0 0 -0.4288818,0.1085303 l -5.8524037,2.7963394 a 1.1191255,1.1099671 0 0 0 -0.605524,0.7529759 l -1.443828,6.2812846 a 1.1191255,1.1099671 0 0 0 0.151943,0.851028 1.1191255,1.1099671 0 0 0 0.06362,0.08832 l 4.0508,5.036555 a 1.1191255,1.1099671 0 0 0 0.874979,0.417654 l 6.4961011,-0.0015 a 1.1191255,1.1099671 0 0 0 0.8749788,-0.416906 L 1.3818872,15.149453 A 1.1191255,1.1099671 0 0 0 1.5981986,14.210104 L 0.15212657,7.9288154 A 1.1191255,1.1099671 0 0 0 -0.45339794,7.1758396 L -6.3065496,4.3809971 A 1.1191255,1.1099671 0 0 0 -6.8492015,4.2724668 Z" style="fill:#326ce5;fill-opacity:1;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" />
	<path d="M -6.8523435,3.8176372 A 1.1814304,1.171762 0 0 0 -7.3044284,3.932904 l -6.1787426,2.9512758 a 1.1814304,1.171762 0 0 0 -0.639206,0.794891 l -1.523915,6.6308282 a 1.1814304,1.171762 0 0 0 0.160175,0.89893 1.1814304,1.171762 0 0 0 0.06736,0.09281 l 4.276094,5.317236 a 1.1814304,1.171762 0 0 0 0.92363,0.440858 l 6.8576188,-0.0015 a 1.1814304,1.171762 0 0 0 0.9236308,-0.44011 l 4.2745966,-5.317985 a 1.1814304,1.171762 0 0 0 0.228288,-0.990993 L 0.53894439,7.6775738 A 1.1814304,1.171762 0 0 0 -0.10026101,6.8834313 L -6.2790037,3.9321555 A 1.1814304,1.171762 0 0 0 -6.8523435,3.8176372 Z m 0.00299,0.4550789 a 1.1191255,1.1099671 0 0 1 0.5426517,0.1085303 l 5.85315169,2.7948425 A 1.1191255,1.1099671 0 0 1 0.15197811,7.9290648 L 1.598051,14.21035 a 1.1191255,1.1099671 0 0 1 -0.2163123,0.939348 l -4.0493032,5.037304 a 1.1191255,1.1099671 0 0 1 -0.8749789,0.416906 l -6.4961006,0.0015 a 1.1191255,1.1099671 0 0 1 -0.874979,-0.417652 l -4.0508,-5.036554 a 1.1191255,1.1099671 0 0 1 -0.06362,-0.08832 1.1191255,1.1099671 0 0 1 -0.151942,-0.851028 l 1.443827,-6.2812853 a 1.1191255,1.1099671 0 0 1 0.605524,-0.7529758 l 5.8524036,-2.7963395 a 1.1191255,1.1099671 0 0 1 0.4288819,-0.1085303 z" style="color:#000000;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:medium;line-height:normal;font-family:Sans;-inkscape-font-specification:Sans;text-indent:0;text-align:start;text-decoration:none;text-decoration-line:none;letter-spacing:normal;word-spacing:normal;text-transform:none;writing-mode:lr-tb;direction:ltr;baseline-shift:baseline;text-anchor:start;display:inline;overflow:visible;visibility:visible;fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none;marker:none;enable-background:accumulate" />
</g>
<text x="9.976531" y="16.811775" style="font-style:normal;font-weight:normal;font-size:10.58333302px;line-height:6.61458349px;font-family:Sans;letter-spacing:0px;word-spacing:0px;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.26458332px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1">
	<tspan x="9.976531" y="16.811775" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:2.82222223px;font-family:Arial;-inkscape-font-specification:'Arial, Normal';text-align:center;writing-mode:lr-tb;text-anchor:middle;fill:#ffffff;fill-opacity:1;stroke-width:0.26458332px">node</tspan>
</text>
<path d="m 9.9921803,4.0942544 c -0.1383298,-0.0044 -3.9950998,1.8918731 -4.0455299,1.9891191 -0.12117,0.233682 -0.9989,4.2818275 -0.94731,4.3690745 0.03,0.05065 0.66219,0.851861 1.40458,1.780327 l 1.3498201,1.688014 2.2211901,9.31e-4 2.2216404,9.31e-4 1.41321,-1.765731 1.41365,-1.765228 -0.49479,-2.1685764 c -0.2722,-1.1927661 -0.51566,-2.1886141 -0.54053,-2.2126041 -0.0695,-0.06688 -3.92096,-1.9137941 -3.9959307,-1.9162151 z m 0.1961407,0.947753 0.90893,0.2635771 -0.90893,0.263576 -0.9089209,-0.263576 z m -0.9089209,0.36452 0.8511209,0.2532261 -0.004,1.183289 -0.8468109,-0.469347 z m 1.8178509,0 0,0.9671681 -0.84679,0.469347 -0.004,-1.183289 z M 8.8997705,7.0212055 9.8087101,7.2847812 8.8997705,7.5483582 7.9908504,7.2847812 Z m 2.2087005,0 0.90894,0.2635757 -0.90894,0.263577 -0.90893,-0.263577 z m -3.1176206,0.3645197 0.8511202,0.252792 -0.004,1.1832908 -0.8468199,-0.468915 z m 1.8178597,0 0,0.9671678 -0.8468098,0.468915 -0.004,-1.1832908 z m 0.3908309,0 0.85113,0.252792 -0.004,1.1832908 -0.84682,-0.468915 z m 1.81787,0 0,0.9671678 -0.84682,0.468915 -0.004,-1.1832908 z M 8.5677505,8.9007534 c 0.2706299,0.0096 0.0611,0.281909 0.3684101,0.427935 0.3277495,0.1557644 0.3953995,-0.235354 0.6013395,0.06341 0.20599,0.2987664 -0.18339,0.2232394 -0.15443,0.5849568 0.029,0.3617188 0.40165,0.2248588 0.24589,0.5526068 -0.15575,0.327746 -0.28532,-0.04764 -0.5840895,0.158317 -0.2987401,0.205957 0.006,0.460208 -0.35546,0.489192 -0.3617401,0.02898 -0.1015001,-0.270447 -0.42924,-0.426208 -0.32775,-0.155765 -0.3953801,0.234921 -0.6013402,-0.06385 -0.2059599,-0.298767 0.1838299,-0.22281 0.15485,-0.584528 -0.029,-0.3617182 -0.4016499,-0.2248592 -0.24587,-0.5526042 0.1557501,-0.3277494 0.2848801,0.04764 0.5836502,-0.1583204 0.2987898,-0.205956 -0.006,-0.460208 0.3559099,-0.48919 0.022499,-0.0018 0.0424,-0.0023 0.0604,-0.0018 z m 2.3359605,0.362794 c 0.48335,0.01358 0.0146,0.4672184 0.45596,0.6647664 0.44144,0.1975482 0.46714,-0.454103 0.79937,-0.102669 0.33221,0.3514322 -0.31997,0.3406402 -0.14753,0.7924552 0.17243,0.451813 0.65163,0.0092 0.63802,0.49264 -0.0137,0.483411 -0.46723,0.01456 -0.66477,0.455977 -0.19755,0.441412 0.4541,0.467143 0.10266,0.799357 -0.35141,0.332212 -0.34021,-0.319974 -0.79202,-0.147534 -0.45183,0.172437 -0.009,0.65161 -0.49265,0.638019 -0.48339,-0.01358 -0.0146,-0.467216 -0.45596,-0.664764 -0.4414105,-0.197551 -0.4675805,0.454102 -0.7997909,0.102669 -0.3322097,-0.351431 0.3199804,-0.340209 0.14754,-0.792025 -0.17245,-0.451815 -0.6516296,-0.0092 -0.6380295,-0.492642 0.013699,-0.483408 0.4672095,-0.01499 0.6647795,-0.456405 0.1975204,-0.441414 -0.45411,-0.467143 -0.10269,-0.7993572 0.3514505,-0.332214 0.3406505,0.3199712 0.7924609,0.147534 0.45184,-0.17244 0.009,-0.6516114 0.49265,-0.6380214 z M 8.5888903,9.5172028 c -0.2936499,9e-5 -0.5316098,0.238249 -0.5314498,0.5318982 7.99e-5,0.293481 0.2379701,0.531377 0.5314498,0.531467 0.2936602,1.59e-4 0.5318202,-0.23781 0.5319,-0.531467 1.601e-4,-0.2938252 -0.2380699,-0.5320572 -0.5319,-0.5318982 z m 2.2643607,0.4805634 c -0.58689,-1.96e-4 -1.0627109,0.4756148 -1.0625209,1.0625028 5e-5,0.586719 0.4758009,1.062267 1.0625209,1.062071 0.58654,-5.8e-5 1.06201,-0.475531 1.06206,-1.062071 1.9e-4,-0.586708 -0.47535,-1.0624448 -1.06206,-1.0625028 z" style="opacity:1;fill:#ffffff;fill-opacity:1;stroke:#eeeeee;stroke-width:0;stroke-miterlimit:10;stroke-dasharray:none;stroke-dashoffset:11.23642349;stroke-opacity:1" />
</g>`)

	}

};	
