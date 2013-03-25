/*

Animation functions taken with slight modification from Apple Widgets

*/


var animation = {duration:0, starttime:0, to:1.0, now:0.0, from:0.0, firstElement:null, timer:null};

/***********************************************************************
/* The Animator class
/**********************************************************************/
Animator = function (from,to,duration,setvalue,onstart,onfinish) {
	this.startValue = from;
	this.endValue = to;
	this.fromValue = from;
	this.toValue  = to;
	this.duration = duration;
	this.setvalue = setvalue;
	this.onstart  = onstart;
	this.onfinish = onfinish;

	this.currentValue = this.startValue;
	this.direction    = 1;
	this.startTime = 0;
	this.framerate = 13;
	this.timer = null;
}

Animator.prototype = {

animate : function () {
	if ( !this.timer) {
		this.fromValue = this.direction>0 ? this.startValue : this.endValue;
		this.toValue = this.direction>0 ? this.endValue : this.startValue;

		this.startTime = (new Date).getTime() - this.framerate;
		var self = this;
		this.timer = setInterval( function (){ self._frame();}, this.framerate);
		if (this.onstart)
			self.onstart(this);
	}
},

animateInDirection : function (direction) {
	this.setDirection(direction);
	if ( this.currentValue != this.toValue)
		this.animate();
},

stopAnimate : function () {
	if (this.timer) {
		clearInterval(this.timer);
		this.timer = null;
	}
},

setState : function (scale) {
	this.stopAnimate();

	this.currentScale = scale;
	this.currentValue = interpolate(this.fromValue, this.toValue, scale);
	this.setvalue(this,this.currentValue);

	if ( scale == 1 && this.onfinish ) {
		var self = this;
		setTimeout(function () {self.onfinish(self);}, 0);	// call after the last frame is drawn
	}
},

_frame : function () {
	var T = (new Date).getTime() - this.startTime;

	if ( T >= this.duration) {
		this.stopAnimate();

		this.currentScale = 1;
		this.currentValue = this.toValue;
		this.setvalue(this,this.currentValue);

		if (this.onfinish) {
			var self = this;
			setTimeout( function () {self.onfinish(self);}, 0);	// call after the last frame is drawn
		}
	} else {	
		var scale = 0.5 - (0.5 * Math.cos(Math.PI * Math.max( T, 0) / this.duration));
		this.currentScale = scale;
		this.currentValue = interpolate(this.fromValue, this.toValue, scale);
		this.setvalue(this,this.currentValue);
	}	
},

setDirection : function (direction) {
	if ( direction != this.direction) {
		this.direction = direction;

		this.fromValue = direction>0 ? this.startValue : this.endValue;
		this.toValue = direction>0 ? this.endValue : this.startValue;

		if (this.timer) {
			var now = (new Date).getTime();
			var remainingTime = this.startTime + this.duration - now;
			this.startTime = now - remainingTime;
		}
	}
},

isMin : function () {
	return this.direction ? this.currentValue == this.fromValue : this.currentValue == this.toValue;
},

isMax : function () {
	return this.direction ? this.currentValue == this.toValue : this.currentValue == this.fromValue;
}

}

/* The animation routine for the 'i' ... can't use the Animator class because of a lovely webcore bug. */
function animate()
{
    var T;
    var ease;
    var time = (new Date).getTime();


    T = limit_3(time-animation.starttime, 0, animation.duration);

    if (T >= animation.duration)
    {
        clearInterval (animation.timer);
        animation.timer = null;
        animation.now = animation.to;
    }
    else
    {
        ease = 0.5 - (0.5 * Math.cos(Math.PI * T / animation.duration)); ///
        animation.now = computeNextFloat (animation.from, animation.to, ease);
    }

    animation.setValue( animation.now );
}
function limit_3 (a, b, c)
{
    return a < b ? b : (a > c ? c : a);
}
function computeNextFloat (from, to, ease)
{
    return from + (to - from) * ease;
}
function interpolate (from, to, ease)
{
    return from + (to - from) * ease;
}