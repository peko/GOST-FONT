// Script for Adobe Illustrator
// Run throught layer
// Get all Path items
// Generate object for js

var STEPS = 3;
var SCALE = 1.0;
var PRECISION = 3;

var D = activeDocument;
var L = D.layers;

var font={}; 

function bezier2lines(p1,p2,p3,p4, steps) {
    
    function bezier(p0, p1, p2, p3, t) {
      var s = 1 - t;
      return {x: s*s*s*p0.x + 3*s*s*t*p1.x + 3*s*t*t*p2.x + t*t*t*p3.x,
              y: s*s*s*p0.y + 3*s*s*t*p1.y + 3*s*t*t*p2.y + t*t*t*p3.y};
    }
    
    var path = "";
    
    var x0 = p1.x;
    var y0 = p1.y;
    
    for(var i=1; i<=steps; i++) {
        var p = bezier(p1, p2, p3, p4, 1.0*i/steps);
        var x = p.x-x0;
        var y = p.y-y0;
        path += "l"+x.toFixed(PRECISION)+","+y.toFixed(PRECISION)+" ";
        x0 = p.x;
        y0 = p.y;
    }

    return path;
}

function parseSegment(a,b) {
   var path = "";
   // check if both ends have no handlers eles draw simple lines
   if(
   (a.pointType == PointType.SMOOTH && !(a.anchor[0] == a.rightDirection[0] && a.anchor[1] == a.rightDirection[1])) 
   || 
   (b.pointType == PointType.SMOOTH && !(b.anchor[0] == b.leftDirection [0] && b.anchor[1] == b.leftDirection [1]))
   ) {
      path+= bezier2lines (
        { x:((a.anchor        [0])*SCALE), y:(a.anchor        [1])*SCALE},
        { x:((a.rightDirection[0])*SCALE), y:(a.rightDirection[1])*SCALE},
        { x:((b.leftDirection [0])*SCALE), y:(b.leftDirection [1])*SCALE},
        { x:((b.anchor        [0])*SCALE), y:(b.anchor        [1])*SCALE}, 
        STEPS);            
   } else { 
     x = (b.anchor[0]-a.anchor[0])*SCALE;
     y = (b.anchor[1]-a.anchor[1])*SCALE;
     path+= "l"+x.toFixed(PRECISION)+","+y.toFixed(PRECISION)+" ";
   }
   return path;
}

function parsePath(c, m) {
    
    var points = c.pathPoints;
    var path = "";    
    var x,y;
    var a,b;
    for(var j=0; j<points.length; j++) {

       // a ----> b                
       
       b=points[j];
       
       if(j==0) {
            x = (b.anchor[0]-m[0])*SCALE;
            y = (b.anchor[1]-m[1])*SCALE;
            path+="m"+x.toFixed(PRECISION)+","+y.toFixed(PRECISION)+" ";
            continue;
       }
       a = points[j-1]
       path += parseSegment(a,b);
    }
    
    if(c.closed) {
       a = points[points.length-1];
       b = points[0];
       path+=parseSegment(a,b);    
    }
    
    return path;
} 

function checkName(n) {
  if(n=="\\" || n=="\"") return "\\"+n;
  return n;
}

function parseFont(l) {
    var data = "";
    // single path 
    for(var i=0;i<l.pathItems.length; i++){
        var c=l.pathItems[i]
        if(c && c.name.length>0) {
            c.geometricBounds[2]
            data += "    \"" + checkName(c.name) + "\":\n";
            data += "        d: \""+parsePath(c, [0, 0])+"\"\n";
            data += "        w: "+(c.geometricBounds[2]*SCALE).toFixed(PRECISION)+"\n";
        }
    }

    // compound paths
    for (var i=0; i<l.compoundPathItems.length; i++) {
        var c = l.compoundPathItems[i];
        var path = "";
        var m;
        
        if(c && c.name.length>0) {
            data += "    \""+checkName(c.name)+"\":\n";
            
            for(var j=0; j<c.pathItems.length; j++) {
                if(j==0) m = [0,0]
                else {
                    var p, pp, ppp;
                    pp = c.pathItems[j-1]; // prev path points
                    ppp = pp.pathPoints;            
                    if(pp.closed) p = ppp[0];
                    else p = ppp[ppp.length-1];
                    
                    m = [p.anchor[0], p.anchor[1]];
                }
                var s = c.pathItems[j];
                path += parsePath(s, m);
            }
            data += "        d: \""+path+"\"\n";
            data += "        w: "+(c.geometricBounds[2]*SCALE).toFixed(PRECISION)+"\n";
        }
    }
    return data;
}

if(L) {
    var data = ""
    for(var i=0;i<L.length; i++){
        var l = L[i];
        if(l.name.indexOf("Guides")==-1) {
           data += parseFont(l);
        }
    }

    var f= File(D.path+"/font.coffee");
    f.remove();
    f.open("w");
    f.write("GHOST=\n");
    f.write(data);
    f.close();

}

// GARBAGE COLLECTOR
$.gc();