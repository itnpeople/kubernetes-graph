import {Transform}	from "@/components/graph/utils/transform";
import {Lang}		from "@/components/graph/utils/lang";

export class Bounds {

    height: number;
    width: number;
    x: number;
    y: number;
	bottom: number;
	right: number;

	constructor(selection:d3.Selection<SVGGElement, any, Element, any>) {

		let bounds:DOMRect
		
		if( selection.node() instanceof SVGGElement ) {
			bounds = selection.node()!.getBBox()
			this.x = bounds.x;
			this.y = bounds.y;
			this.width = bounds.width;
			this.height = bounds.height;
			this.bottom = bounds.y + bounds.height;
			this.right = bounds.x + bounds.width;
		} else {
			bounds = selection.node()!.getBoundingClientRect();
			// padding 반영
			this.x = bounds.left + Lang.toNumber(selection.style("padding-left"),0);
			this.right = bounds.right - Lang.toNumber(selection.style("padding-right"),0);
			this.y = bounds.top + Lang.toNumber(selection.style("padding-top"),0);
			this.bottom = bounds.bottom - Lang.toNumber(selection.style("padding-bottom"),0);
			this.width = this.right-this.x;
			this.height = this.bottom - this.y;

		}

	}
}


export class UI {

	/**
	 * 주어진 element 의 부모 element 높이 맞추어 수직정렬
	 * 
	 */	
	public static alignVertical(el:SVGGElement) {
		
		if (el ==null || el.parentElement == null) return 

		const rect:DOMRect = el.getBoundingClientRect();
		const rectParent:DOMRect = el.parentElement.getBoundingClientRect();

		if(rect.height < rectParent.height) {
			Transform.instance(el).shiftY((rectParent.height-rect.height)/2);
		}

	}

	/**
	 * 주어진 element 의 부모 element 너비 맞추어 수평정렬
	 * 
	 */	
	public static alignHorizonal(el:SVGElement) {

		if (el ==null || el.parentElement == null) return 

		const rect:DOMRect = el.getBoundingClientRect();
		const rectParent:DOMRect = el.parentElement.getBoundingClientRect();

		if(rect.width < rectParent.width) {
			Transform.instance(el).shiftX((rectParent.width-rect.width)/2);
		}

	}

	/**
	 * 같은 형재 element 들을 가운데 수평 정렬
	 * 
	 */	
	public static alignHorizonals(els:Array<SVGElement>) { 

		if(els.length < 1) return;
		let maxWidth:number = 0;

		els.forEach( (el:SVGElement) => {
			const rect:DOMRect = el.getBoundingClientRect();
			maxWidth = Math.max(rect.width+rect.left, maxWidth)
		});

		els.forEach( (el:SVGElement) => {
			const rect:DOMRect = el.getBoundingClientRect();
			if(rect.width < maxWidth) {
				Transform.instance(el).shiftX((maxWidth-rect.width)/2);
			}
		});


	}


	/**
	 * 스크롤 가능한 레이어 추가
	 * 
	 * @param X 추가할 레이어의 X 위치
	 * @param Y 추가할 레이어의 Y 위치
	 * @param bounds 기준이 되는 bounds (스크롤 여부를 결정(계산)할 때 사용)
	 * @param parentEl 추가할 레이어 
	 * @param func 레이어의 내용 함수
	 * @param args 레이어의 내용 함수의 파라메터
	 */
	public static appendScrollableLayer(X:number, Y:number, bounds:Bounds, parentEl:d3.Selection<SVGGElement,any,SVGElement,any>, func: (selection: d3.Selection<SVGGElement, any, SVGElement, any>, ...args: any) => void , ...args: any[]) {

		const margin:number = 10;	//마진 기준 (top,left, right, bottom 동일 처리)

		// 스크롤을 위해서 "div" 사용을 위해서 "foreignObject" 엘리먼트 활용
		let scrollEl:d3.Selection<SVGForeignObjectElement,any,SVGElement,any> = parentEl.append("foreignObject")
			.attr("x",X)
			.attr("y",Y)
			.html(`<div xmlns="http://www.w3.org/1999/xhtml" style="height: 100%;padding:${margin}px;"></div>`)

		// div 엘리먼트에 svg 추가
		let svg:d3.Selection<SVGSVGElement,any,SVGElement,any> = scrollEl.select("div").append("svg")
		
		// div 엘리먼트에 g.outline 추가
		let outlineEl:d3.Selection<SVGGElement,any,SVGElement,any> = svg.append("g").attr("class","outline")

		// outline 엘리먼트에 파라메터로 받은 render 실행
		outlineEl.call(func, args);

			
		// 그려진 outline Bounds
		const rect:DOMRect = outlineEl.node()!.getBoundingClientRect();

		// 범례 백그라운드
		outlineEl.insert("rect", "g.group:first-child")
			.attr("class", "background")
			.attr("width", rect.width)
			.attr("height", rect.height)

		// foreignObject / svg 엘리먼트 너비
		scrollEl.attr("width", rect.width + (margin*2));
		svg.attr("width", rect.width + (margin*2))
		
		// 스크롤 위한 높이 정의 (내용이 더 크면 스크롤이 생기도록함)
		const outH:number = bounds.height - (Y+margin)-margin;								//outer 높이 : bottom 마진 + outline bottom 마진 반영(x2)
		const inH:number = outlineEl!.node()!.getBoundingClientRect().height + (margin*2);	//innert 높이

		scrollEl.attr("height", (inH>outH) ? outH:inH);										//내용 높이(inenr)가 더 크면 outer , 내용 높으가 더 작다면 inner 로 줄임
		if(inH>outH) scrollEl.select("div").style("overflow-y", "scroll");
		svg.attr("height", inH );

	}

	/**
	 * "text" element 말 줄임 
	 *  - width 초과되면 "..." 말줄임
	 *
	 * @param el "text" element
	 * @param width 최대 너비
	 */
	public static ellipsisText(el:SVGTextElement, width:number): void {
		width -= el.x.baseVal[0].value;	//x 값 빼기
		if(el.getComputedTextLength() > width) {
			const text = `${el.textContent}`;
			const chars = text.split("");
			let len:number = chars.length - 3;
			while(len > 1) {
				len--;
				el.textContent = `${text.substring(0, len)}...`
				if(el.getComputedTextLength() < width) break;
			}
		}
	}

	public static appendBox(parentEl:d3.Selection<SVGGElement, any, SVGElement,any>, 
		render: (selection: d3.Selection<SVGGElement, any, SVGElement, any>, ...args: any[]) => void, 
		width?:number, padding?:{top:number,left:number, right:number, bottom:number}, border?:{width:number, dash:string}): d3.Selection<SVGGElement, any, SVGElement,any> {

		const boxWrap = parentEl.append("g").attr("class","boxWrap");

		//rendering
		const box = boxWrap.append("g").attr("class","box");
		if(render) box.call(render)

		// after rendering > dash box
		let bounds:DOMRect = boxWrap.node()!.getBBox();
		const bottom:number = bounds.y + bounds.height + (padding?padding.top+padding.bottom:0);
		const right:number = bounds.x + (width?width:bounds.width); //stroke-width 반영

		boxWrap.append("path")
			.attr("class","background")
			.attr("d",`M${bounds.x},${bounds.y} L${right},${bounds.y} L${right},${bottom} L${bounds.x},${bottom} L${bounds.x},${bounds.y}`)
			//.attr("fill-opacity",".1")
			.attr("fill","none")

		if(border) boxWrap.attr("stroke","black").attr("stroke-width",border.width).attr("stroke-dasharray", border.dash)
			

		if(padding) Transform.instance(box.node()!).shift(padding.left,padding.top)
		return box

	}

}
