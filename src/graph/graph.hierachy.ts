"uss strict"
import * as d3			from "d3";
import * as d3Select	from "d3-selection";
import {ConfigModel}	from "@/components/graph/model/models";
import {UI}				from "@/components/graph/utils/lang";
import {GraphBase}		from "@/components/graph/graph.base";

/**
 * Topology 그래프 랜더러
 */
export class HierachyGraph extends GraphBase {

	/**
	 * (abstract) 랜더링
	 * @param data 토플로지를 위한 k8s 데이터 (model.K8s)
	 */
	public populate(conf:ConfigModel.Config, svgEl:d3Select.Selection<SVGSVGElement, any, SVGElement, any>, bounds:DOMRect, outlineEl:d3Select.Selection<SVGGElement,any,SVGElement,any>) {
		
		if(!conf.data) return;

		// svg > defs
		if(svgEl.select("defs").size() == 0) svgEl.append("defs").call(HierachyGraph.renderDefs, conf);

		// data 가공
		let data = conf.data;
		data =   {
			"name": "kube-system",
			"kind": "namespace",
			"children": [
				{ 
					"name": "calico-kube-controllers",
					"kind": "deployment",
					"children": [
						{
							"name": "rs/calico-kube-controllers-97769f7c7",
							"kind": "replicaset",
							"children": [
								{
									"name": "pod/calico-kube-controllers-97769f7c7-q22tf",
									"kind": "pod"
								}
							]
						},
					]
				},
				{
					"name": "calico-node",
					"kind": "daemonset",
					"children": [
						{
							"name": "calico-node-8d45s",
							"kind": "pod",
						},
						{
							"name": "calico-node-bfrsh",
							"kind": "pod",
						},
						{
							"name": "calico-node-qhkmj",
							"kind": "pod",
						},
					]
				}
			]
		};
		// body
		let bodyEl:d3Select.Selection<SVGGElement,any,SVGElement,any> = outlineEl.append("g");	
		bodyEl.call(HierachyGraph.renderRoot, data, bounds);

		//bodyEl.selectAll(".node").each(function(a) {
		//	//console.log(arguments);
		//	console.log(d3Select.select(this));
		//});

		bodyEl.selectAll(".node").each((d,i,nodes) => {
			//console.log(arguments);
			console.log(d3Select.select(nodes[i]).node());
		});

	


	}
	private static renderRoot(parentEl:d3Select.Selection<SVGGElement,any,SVGElement,any>, data:any, bounds:DOMRect) {

		let nodes = d3.hierarchy(data, (d:any) => d.children);	//  assigns the data to a hierarchy using parent-child relationships
		nodes = d3.tree().size([bounds.height, bounds.width]).nodeSize([30, bounds.width / 6])(nodes) // maps the node data to the tree layout
		nodes.each( (d:any)=> {
			if(d.data.kind == "pod") {
				d.depth = 3
				d.y =  (bounds.width / 6)*d.depth
			}
		})

		// adds the links between the nodes
		parentEl.selectAll(".link")
			.data( nodes.descendants().slice(1))
		.enter().append("path")
			.attr("class", "link")
			.attr("d", (d:any) => `M${d.y},${d.x}C${(d.y + d.parent.y) / 2},${d.x} ${(d.y + d.parent.y) / 2},${d.parent.x} ${d.parent.y},${d.parent.x}`);

		// adds each node as a group
		let node = parentEl.selectAll(".node")
			.data(nodes.descendants())
		.enter().append("g")
			//.attr("class", (d) => `node${d.children ? " node--internal" : " node--leaf"}` )
			.attr("class", "node node--leaf")
			.attr("transform", (d:any) => `translate(${d.y},${d.x-12})`);

		// adds the icon to the node
		node.append("use")
			.attr("class","ico").attr("height","24").attr("width","24")
			.attr("xlink:href", (d:any)=>`#ac_ic_${d.data.kind}`)

		node.append("text")
			.attr("dy", (d) => d.children ? ".5em" : "1.3em")
			.attr("x", "2.2em")
			.text((d) =>d.data.name);

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


	}
	
	
};	
