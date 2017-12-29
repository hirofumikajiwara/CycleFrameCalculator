window.onload = window_onload;

var objWidth = 30;
var objHeight = 30;
var canvas; // canvas
var ctx; // context
var iconCtx;
var CanvasWidth = 500;
var CanvasHeight = 400;

var currentMovePoint = null;
var lastSelectedMovePoint = null;

/**
 / Common
 **/

 // もともとの左上と右下の値に対して、新しいy座標からx座標を取得します。
function getX(lefttop, rightbottom, newY) {
  var ret = (rightbottom.x - lefttop.x)
    * (newY - lefttop.y)
    / (rightbottom.y - lefttop.y);
  ret += lefttop.x;
  return ret;
}

var Point = function (x, y) {
  this.x = x;
  this.y = y;
}

// マウスでドラッグするポイント
var MovePoint = function (x, y, allowedMode, editableArea) {
  this.x = x;
  this.y = y;
  this.allowedMode = allowedMode; // どの方向に動かせるか。1bit目がhorizontal、2bit目がvertical
  this.editableArea = editableArea; // 動かせる範囲(未使用)
  this.mode = 0;  // どの方向に動かせる状態になっているか
  this.display = function () {
    if (this.mode == 0) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.fillRect(this.x - (objWidth / 2), this.y - (objHeight / 2), objWidth, objHeight);
    }
    else {
      var iconImage

      if (this.mode == 1) {
        iconImage = iconCtx.getImageData(0, 0, objWidth, objHeight);
      }
      else if (this.mode == 2) {
        iconImage = iconCtx.getImageData(objWidth, 0, objWidth, objHeight);
      }
      else {
        iconImage = iconCtx.getImageData(objWidth * 2, 0, objWidth, objHeight);
      }

      ctx.putImageData(iconImage, this.x - (objWidth / 2), this.y - (objHeight / 2));
    }
  };
}

var movePoints;
var frame = new function () {
  // prime point
  this.forkhead = new MovePoint(415, 274, 1);
  this.headtop = new MovePoint(350, 114, 3);
  this.headtop.area = 0;
  this.headbottom = new MovePoint(359, 142, 2);
  this.midtop = new MovePoint(164, 145, 3);
  this.midtop.area = 0;
  this.midbottom = new MovePoint(214, 298, 3);
  this.tail = new MovePoint(76, 274, 1);

  // middle point 複数のprime pointを動かすためのポイント
  this.forkmid = new MovePoint(getX(this.headtop, this.headbottom, this.forkhead.y - objHeight), this.forkhead.y - objHeight, 1);

  this.toptube = new MovePoint((this.headtop.x + this.midtop.x) / 2, (this.headtop.y + this.midtop.y) / 2, 2);
  this.toptube.moveAvarage = function () {
    frame.toptube.x = (frame.headtop.x + frame.midtop.x) / 2;
    frame.toptube.y = (frame.headtop.y + frame.midtop.y) / 2;
  };

  this.mainpole = new MovePoint((this.midbottom.x + this.midtop.x) / 2, (this.midbottom.y + this.midtop.y) / 2, 1);
  this.mainpole.moveAvarage = function () {
    frame.mainpole.x = (frame.midbottom.x + frame.midtop.x) / 2;
    frame.mainpole.y = (frame.midbottom.y + frame.midtop.y) / 2;
  };

  movePoints = [this.forkhead,
  this.forkmid,
  this.headtop,
  this.headbottom,
  this.midtop,
  this.midbottom,
  this.tail,
  this.toptube,
  this.mainpole];

  /**
   * setMode
   **/

  var normalSetMode = function (movePoint) {
    movePoint.setMode = function (mode) {
      movePoint.mode = (movePoint.allowedMode & mode);
    };
  };

  this.headtop.setMode = function (mode) {
    frame.headtop.mode = (frame.headtop.allowedMode & mode);
    frame.headbottom.mode = frame.headtop.mode;
    frame.forkhead.mode = (frame.forkhead.allowedMode & mode);
    frame.forkmid.mode = (frame.forkhead.allowedMode & mode);
  };

  normalSetMode(this.forkhead);
  normalSetMode(this.headbottom);
  normalSetMode(this.midtop);
  normalSetMode(this.midbottom);
  normalSetMode(this.tail);

  this.forkmid.setMode = function (mode) {
    frame.forkmid.mode = (frame.forkmid.allowedMode & mode);
    frame.headbottom.mode = frame.forkmid.mode;
  }

  this.toptube.setMode = function (mode) {
    frame.toptube.mode = (frame.toptube.allowedMode & mode);
    frame.headtop.mode = frame.toptube.mode;
    frame.midtop.mode = frame.toptube.mode;
    frame.headbottom.mode = frame.toptube.mode;
  };

  this.mainpole.setMode = function (mode) {
    frame.mainpole.mode = (frame.mainpole.allowedMode & mode);
    frame.midbottom.mode = frame.mainpole.mode;
    frame.midtop.mode = frame.mainpole.mode;
  };

  /**
   * move
   **/

  // 範囲内に収まっているかを返します。収まっている場合は、trueMethodを実行します。
  var isInRange = function (value, min, max, trueMethod) {
    if (value > min && value < max) {
      if (trueMethod != undefined) {
        trueMethod();
      }
      return true;
    }
    else {
      return false;
    }
  };

  /**
   * headtop.move
   **/
  this.headtop.moveVertical = function (length) {
    var miny = 0;
    var maxy = frame.midbottom.y - objHeight;

    // 平行になった時点で一回止めるために、areaを使用しています。
    if (frame.headtop.area == 0) {
      if (frame.headtop.y + length < frame.midtop.y) {
        frame.headtop.area = 1;
      }
      else if (frame.headtop.y + length > frame.midtop.y) {
        frame.headtop.area = 2;
      }
    }

    if (frame.headtop.area == 1) {
      maxy = frame.midtop.y;
      if (isInRange(maxy, frame.headtop.y, frame.headtop.y + length + 1)) {
        var lengthOfBar = frame.headbottom.y - frame.headtop.y;
        frame.headtop.y = maxy;
        frame.headbottom.y = frame.headtop.y + lengthOfBar;
        frame.headtop.area = 0;
        currentMovePoint = null;  // stop moving.
        frame.toptube.moveAvarage();
        return true;
      }
    }

    if (frame.headtop.area == 2) {
      miny = frame.midtop.y;
      if (isInRange(miny, frame.headtop.y + length - 1, frame.headtop.y)) {
        var lengthOfBar = frame.headbottom.y - frame.headtop.y;
        frame.headtop.y = miny;
        frame.headbottom.y = frame.headtop.y + lengthOfBar;
        frame.headtop.area = 0;
        currentMovePoint = null;  // stop moving.
        frame.toptube.moveAvarage();
        return true;
      }
    }

    if (frame.headtop.y + length < 0) {
      return false;
    }

    if (frame.headbottom.y + length > frame.midbottom.y) {
      return false;
    }

    frame.headtop.y += length;
    frame.headbottom.y += length;
    frame.headbottom.x = getX(frame.headtop, frame.forkmid, frame.headbottom.y);
    frame.toptube.moveAvarage();
    return true;
  };

  this.headtop.moveHorizontal = function (length) {
    if (frame.headbottom.x + length > CanvasWidth) {
      return false;
    }

    if (frame.headtop.x + length < frame.midbottom.x) {
      return false;
    }

    frame.headtop.x += length;
    frame.headbottom.x += length;
    frame.forkhead.x += length;
    frame.forkmid.x += length;
    frame.toptube.moveAvarage();
    return true;
  };

  /**
   * headbottom.move
   **/
  this.headbottom.moveVertical = function (length) {

    if (!isInRange(frame.headbottom.y + length, frame.headtop.y + objHeight / 2, frame.midbottom.y)) {
      return false;
    }

    var newx = getX(frame.headtop, frame.headbottom, frame.headbottom.y + length);

    if (newx > CanvasWidth) {
      return false;
    }

    frame.headbottom.y += length;
    frame.headbottom.x = newx;
    return true;
  };

  /**
   * forkmid.move
   **/
  this.forkmid.moveHorizontal = function (length) {
    if (!isInRange(frame.forkmid.x + length, frame.headtop.x, frame.forkhead.x)) {
      return false;
    }
    frame.forkmid.x += length;
    frame.headbottom.x = getX(frame.headtop, frame.forkmid, frame.headbottom.y);
    return true;
  };

  /**
   * midtop.move
   **/
  this.midtop.moveVertical = function (length) {
    var miny = 0;
    var maxy = frame.midbottom.y - objHeight;

    if (frame.midtop.area == 0) {
      if (frame.midtop.y + length < frame.headtop.y) {
        frame.midtop.area = 1;
      }
      else if (frame.midtop.y + length > frame.headtop.y) {
        frame.midtop.area = 2;
      }
    }

    if (frame.midtop.area == 1) {
      maxy = frame.headtop.y;
      if (isInRange(maxy, frame.midtop.y, frame.midtop.y + length + 1)) {
        frame.midtop.y = maxy;
        frame.midtop.area = 0;
        currentMovePoint = null;
        frame.toptube.moveAvarage();
        frame.mainpole.moveAvarage();
        return true;
      }
    }

    if (frame.midtop.area == 2) {
      miny = frame.headtop.y;
      if (isInRange(miny, frame.midtop.y + length - 1, frame.midtop.y)) {
        frame.midtop.y = miny;
        frame.midtop.area = 0;
        currentMovePoint = null;
        frame.toptube.moveAvarage();
        frame.mainpole.moveAvarage();
        return true;
      }
    }

    if (!isInRange(frame.midtop.y + length, miny, maxy)) {
      return false;
    }

    var newx = getX(frame.midtop, frame.midbottom, frame.midtop.y + length);

    if (newx < frame.tail.x) {
      return false;
    }

    frame.midtop.y += length;
    frame.midtop.x = newx;
    frame.toptube.moveAvarage();
    frame.mainpole.moveAvarage();
    return true;
  }

  this.midtop.moveHorizontal = function (length) {
    return isInRange(frame.midtop.x + length, frame.tail.x, frame.midbottom.x
      , function () {
        frame.midtop.x += length;
        frame.toptube.moveAvarage();
        frame.mainpole.moveAvarage();
      });
  }

  /**
   * midbottom.move
   **/
  this.midbottom.moveVertical = function (length) {

    if (!isInRange(frame.midbottom.y + length, Math.max(frame.midtop.y + objHeight, frame.headbottom.y), CanvasHeight)) {
      return false;
    }

    var newx = (frame.midbottom.x - frame.midtop.x)
      * (frame.midbottom.y + length - frame.midtop.y)
      / (frame.midbottom.y - frame.midtop.y);
    newx += frame.midtop.x;
    if (newx > frame.headtop.x) {
      return false;
    }

    frame.midbottom.y += length;
    frame.midbottom.x = newx;
    frame.mainpole.moveAvarage();
    return true;
  }

  this.midbottom.moveHorizontal = function (length) {
    return isInRange(frame.midbottom.x + length, frame.midtop.x, frame.headtop.x
      , function () {
        frame.midbottom.x += length;
        frame.mainpole.moveAvarage();
      });
  }

  /**
   * other.move
   **/

  this.forkhead.moveHorizontal = function (length) {
    return isInRange(frame.forkhead.x + length, frame.forkmid.x, CanvasWidth
      , function () { frame.forkhead.x += length; });
  }

  this.tail.moveHorizontal = function (length) {
    return isInRange(frame.tail.x + length, 0, frame.midtop.x
      , function () { frame.tail.x += length; });
  }

  this.toptube.moveVertical = function (length) {
    if (!isInRange(frame.toptube.y + length, 0, frame.midbottom.y - objHeight)) {
      return false;
    }

    frame.headtop.moveVertical(length);
    frame.midtop.moveVertical(length);

    frame.toptube.moveAvarage();

    return true;
  }

  this.mainpole.moveHorizontal = function (length) {

    if (frame.midtop.x + length < frame.tail.x) {
      return false;
    }

    if (frame.midbottom.x + length > frame.headtop.x) {
      return false;
    }

    frame.midbottom.moveHorizontal(length);
    frame.midtop.moveHorizontal(length);

    frame.mainpole.moveAvarage();

    return true;
  }
}

/**
 * main()
 **/
function window_onload() {
  // Get the canvas element.
  canvas = document.getElementById("myCanvas");

  makeIcons();

  // Make sure you got it.
  if (canvas.getContext) {
    ctx = canvas.getContext("2d");
    reflesh();
  }

  // Add keyboard listener.
  window.addEventListener('mousedown', mouse_down, false);
  window.addEventListener('mouseup', mouse_up, false);
  window.addEventListener('mousemove', mouse_move, false);

}

function makeIcons() {
  var iconCanvas = document.getElementById("iconCanvas");
  if (iconCanvas.getContext) {
    iconCtx = iconCanvas.getContext("2d");
    iconCtx.beginPath();
    iconCtx.fillStyle = "rgba(255, 0, 0, 0.5)";
    iconCtx.fillRect(0, 0, objWidth * 3, objHeight);

    iconCtx.beginPath();
    iconCtx.strokeStyle = "white";

    var writeHorizontalArrow = function (startx) {
      // Horizontal line
      iconCtx.moveTo(startx + 0, 15);
      iconCtx.lineTo(startx + 30, 15);

      // left arrow
      iconCtx.moveTo(startx + 5, 10);
      iconCtx.lineTo(startx + 0, 15);
      iconCtx.lineTo(startx + 5, 20);

      // right arrow
      iconCtx.moveTo(startx + 25, 10);
      iconCtx.lineTo(startx + 30, 15);
      iconCtx.lineTo(startx + 25, 20);
    };
    writeHorizontalArrow(0);

    var writeVerticalArrow = function (startx) {
      // vertical line
      iconCtx.moveTo(startx + 15, 0);
      iconCtx.lineTo(startx + 15, 30);

      // top arrow
      iconCtx.moveTo(startx + 10, 5);
      iconCtx.lineTo(startx + 15, 0);
      iconCtx.lineTo(startx + 20, 5);

      // bottom arrow
      iconCtx.moveTo(startx + 10, 25);
      iconCtx.lineTo(startx + 15, 30);
      iconCtx.lineTo(startx + 20, 25);
    };
    writeVerticalArrow(objWidth);

    // writeCrossArrow
    writeHorizontalArrow(objWidth * 2);
    writeVerticalArrow(objWidth * 2);

    iconCtx.stroke();
  }
}

// draw canvas
function reflesh() {
  ctx.clearRect(0, 0, CanvasWidth, CanvasHeight);

  for (var i = 0; i < movePoints.length; i++) {
    movePoints[i].display();
  }

  var getLengthStr = function (p1, p2)  {
    var k = 4.596;

    var a1 = Math.pow(Math.abs(p1.x - p2.x), 2);
    var a2 = Math.pow(Math.abs(p1.y - p2.y), 2);
    var a3 = Math.sqrt(a1 + a2);

    var pixLength = Math.sqrt(Math.pow(Math.abs(p1.x - p2.x), 2) + Math.pow(Math.abs(p1.y - p2.y), 2));
    return Math.round(pixLength * k) + " mm";
  }

  var getRadiousStr = function(r)  {
    return Math.round(r * (180 / Math.PI)); 
  }

  var writeLine = function (from, to) {
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  };

  var writeHorizontalMesure = function (from, to, y, caption) {
    var Half = 5;
    var Margine = 2;

    ctx.moveTo(from, y - Half);
    ctx.lineTo(from, y + Half);
    ctx.moveTo(from, y);
    ctx.lineTo(to, y);
    ctx.moveTo(to, y - Half);
    ctx.lineTo(to, y + Half);
    ctx.fillText(caption, (from + to - ctx.measureText(caption).width) / 2, y - Margine);

    return getLengthStr(new Point(from, y), new Point(to, y));
  };

  var writeVerticalMesure = function (from, to, x, caption, alinement) {
    var Half = 5;
    var Margine = 2;

    ctx.moveTo(x - Half, from);
    ctx.lineTo(x + Half, from);
    ctx.moveTo(x, from);
    ctx.lineTo(x, to);
    ctx.moveTo(x - Half, to);
    ctx.lineTo(x + Half, to);
    if (alinement == undefined || alinement == "left") {
      ctx.fillText(caption, x + Margine, (from + to) / 2);
    }
    else {
      ctx.fillText(caption, x - ctx.measureText(caption).width - Margine, (from + to) / 2);
    }

    return getLengthStr(new Point(x, from), new Point(x, to));
  };

  var writeMesure = function (from, to, caption, leftRight = -1) {
    var Margine = (objHeight / 2) * leftRight;
    var Half = 5;
    var TextMargine = 5 * leftRight;
    var dblRadian = (Math.atan((to.y - from.y) / (to.x - from.x))) + Math.PI / 2;

    var getNewPoint = function(point, length) {
      return new Point(point.x + Math.cos(dblRadian) * (-length), point.y + Math.sin(dblRadian) * (-length));
    }

    var newFrom = getNewPoint(from, Margine);
    var newTo = getNewPoint(to, Margine);
    writeLine(newFrom, newTo);
    writeLine(getNewPoint(newFrom, -Half), getNewPoint(newFrom, Half));
    writeLine(getNewPoint(newTo, -Half), getNewPoint(newTo, Half));

    var textPoint = getNewPoint(new Point((newFrom.x + newTo.x) / 2, (newFrom.y + newTo.y) / 2), TextMargine);
    if(Margine >= 0){
      ctx.fillText(caption, textPoint.x, textPoint.y);
    }
    else
    {
      ctx.fillText(caption, textPoint.x - ctx.measureText(caption).width, textPoint.y);
    }

    return getLengthStr(from, to);
  };

  var writeRadius = function (point, center, caption) {
    var Margine = objWidth / 2;
    var Radius = 10;
    var Length = 30;
    var TextMargine = 2 + Margine;

    var dblRadian = Math.atan((center.y - point.y) / (center.x - point.x));
    var Dgr = dblRadian / (Math.PI / 180);

    ctx.moveTo(center.x - Margine - Radius, center.y - Margine);
    ctx.arc(center.x - Margine, center.y - Margine, Radius, Math.PI, Math.PI + dblRadian, false);
    ctx.moveTo(center.x - Length - Margine, center.y - Margine);
    ctx.lineTo(center.x - Margine, center.y - Margine);
    ctx.lineTo(center.x - Math.cos(dblRadian) * Length - Margine, center.y - Math.sin(dblRadian) * Length - Margine);
    ctx.fillText(caption, center.x - Radius - ctx.measureText(caption).width - TextMargine, center.y - TextMargine);

    return getRadiousStr(dblRadian);
  };

  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 5;
  writeLine(frame.headtop, frame.headbottom);
  writeLine(frame.midtop, frame.midbottom);
  writeLine(frame.headtop, frame.midtop);
  writeLine(frame.headbottom, frame.midbottom);
  writeLine(frame.midtop, frame.tail);
  writeLine(frame.midbottom, frame.tail);
  // fork
  ctx.moveTo(frame.headbottom.x, frame.headbottom.y);
  ctx.quadraticCurveTo(getX(frame.headtop, frame.forkmid, (frame.headbottom.y + frame.forkhead.y) / 2), (frame.headbottom.y + frame.forkhead.y) / 2, frame.forkhead.x, frame.forkhead.y);
  ctx.stroke();

  // mesure
  var setTextArea = function(id, value)  {
    var textArea = document.getElementById("text" + id);
    //textArea.setAttribute("value", value);
    textArea.innerText = value;
  }

  ctx.beginPath();
  ctx.strokeStyle = "gray";
  ctx.lineWidth = 1;
  
  var subMesureAy = Math.min(frame.midtop.y, frame.headtop.y)
  var subMesureA = new Point(getX(frame.midtop, frame.midbottom, subMesureAy), subMesureAy)
  setTextArea("A", writeHorizontalMesure(frame.midtop.x, frame.headtop.x, subMesureAy - objHeight, "A"));
  setTextArea("B", writeMesure(frame.midtop, frame.midbottom, "B", -1));
  setTextArea("C", writeMesure(frame.headtop, frame.headbottom, "C", 1));
  setTextArea("D", writeRadius(frame.midtop, frame.midbottom, "D"));
  setTextArea("E", writeRadius(frame.headtop, frame.forkmid, "E"));
  setTextArea("F", writeVerticalMesure(frame.tail.y, frame.midbottom.y, frame.midbottom.x + objHeight, "F"));
  setTextArea("G", writeHorizontalMesure(frame.tail.x, frame.forkhead.x, Math.max(frame.tail.y, frame.midbottom.y) + objHeight, "G"));
  setTextArea("H", writeMesure(frame.tail, frame.midbottom, "H", -1));
 
  ctx.stroke();

  var setButtonEnabled = function(button, enabled)
  {
    if(enabled)
    {
      button.removeAttribute("disabled");
    }
    else
    {
      button.setAttribute("disabled", "disabled");
    }
  }
  if(lastSelectedMovePoint == null)
  {
    setButtonEnabled(btnLeft, false);
    setButtonEnabled(btnRight, false);
    setButtonEnabled(btnUp, false);
    setButtonEnabled(btnDown, false);
  }
  else
  {
    setButtonEnabled(btnLeft, (lastSelectedMovePoint.mode & 1) == 1);
    setButtonEnabled(btnRight, (lastSelectedMovePoint.mode & 1) == 1);
    setButtonEnabled(btnUp, (lastSelectedMovePoint.mode & 2) == 2);
    setButtonEnabled(btnDown, (lastSelectedMovePoint.mode & 2) == 2);
  }
}


/**
/ Mouse control
**/

// position of start move.
var startx = 0;
var starty = 0;

function mouse_down(evt) {
  var downedx = evt.clientX - canvas.getBoundingClientRect().left;
  var downedy = evt.clientY - canvas.getBoundingClientRect().top;

  for (var i = 0; i < movePoints.length; i++) {
    if (downedx > (movePoints[i].x - (objWidth / 2)) && downedx < (movePoints[i].x + (objWidth / 2))
      && downedy > (movePoints[i].y - (objHeight / 2)) && downedy < (movePoints[i].y + (objHeight / 2))) {
      startx = evt.clientX;
      starty = evt.clientY;
      currentMovePoint = movePoints[i];
      lastSelectedMovePoint = currentMovePoint;
      currentMovePoint.setMode(3);  // both
      reflesh();
      break;
    }
  }
}

function mouse_up(evt) {
  startx = 0;
  starty = 0;
  // mode = 0;
  for (var i = 0; i < movePoints.length; i++) {
    movePoints[i].setMode(0);
  }
  currentMovePoint = null;
}

function mouse_move(evt) {
  if (startx != 0 && currentMovePoint != null) {
    var downedx = evt.clientX - canvas.getBoundingClientRect().left;
    var downedy = evt.clientY - canvas.getBoundingClientRect().top;

    if (currentMovePoint.mode == 3) {
      if (Math.abs(evt.clientX - startx) > Math.abs(evt.clientY - starty)) {
        currentMovePoint.setMode(1);  // vertical
      }
      else {
        currentMovePoint.setMode(2);  // horizontal
      }
    }

    if (currentMovePoint.mode == 1) {
      if (currentMovePoint.moveHorizontal(evt.clientX - startx)) {
        startx = evt.clientX;
      }
    }
    else if (currentMovePoint.mode == 2) {
      if (currentMovePoint.moveVertical(evt.clientY - starty)) {
        starty = evt.clientY;
      }
    }

    reflesh()
  }
}

var KeyDownMoveLength = 0.25

function clickUp()
{
  lastSelectedMovePoint.setMode(2);
  if(lastSelectedMovePoint.mode == 2)
  {
    lastSelectedMovePoint.moveVertical(-KeyDownMoveLength)
    reflesh()
  }
}

function clickDown()
{
  lastSelectedMovePoint.setMode(2);
  if(lastSelectedMovePoint.mode == 2)
  {
    lastSelectedMovePoint.moveVertical(KeyDownMoveLength)
    reflesh()
  }
}

function clickLeft()
{
  lastSelectedMovePoint.setMode(1);
  if(lastSelectedMovePoint.mode == 1)
  {
    lastSelectedMovePoint.moveHorizontal(-KeyDownMoveLength);
    reflesh()
  }
}

function clickRight()
{
  lastSelectedMovePoint.setMode(1);
  if(lastSelectedMovePoint.mode == 1)
  {
    lastSelectedMovePoint.moveHorizontal(KeyDownMoveLength);
    reflesh()
  }
}




function textEnabled(id, enabled) {
  textarea = document.getElementById(id);

  if (enabled) {
    textarea.removeAttribute("disabled");
  }
  else {
    textarea.setAttribute("disabled");
  }
}

function logTrace(msg) {
  logField = document.getElementById("log");
  logField.innerText += msg + ", ";
}
