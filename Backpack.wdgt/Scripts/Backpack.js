/*

Copyright (C) 2005-2008, Chipt Productions, LLC.  All rights reserved.
Code and design: M. Pennig

No portion of this code may be duplicated or reproduced in another widget 
without written permission from Chipt Productions, LLC. Contact: matt@chipt.com

However, if you have an improvement or idea to offer, please let us know!
*/

var VERSION_NUMBER = "1.2.2";
var gTaskNames = new Array("reminders", "lists", "notes");
var gUsername;
var gToken;
var gUseGrowl;
var gCurrentTask = '';
var gCurrentPage = '';
var gFlipShown = false;
var gIsBackShown = false;
var gIsGrowlReady = false;
var gGrowlTimer = null;
var gGrowlTimer2 = null;
var gIsExpanded = false;
var gIsShown = true;
var gIsDialogActive = false;
var gIsGettingPages = false;
var gReminders = new Array();
var gLists = new Array();
var gNotes = new Array();
var gScroller = null;

//change this to true to enable DEBUG();
gDebug = false;

var ReminderPopups = {
	remindersPopupTime : {
		laterToday: "Later today",
		tomorrowMorning: "Tomorrow morning",
		tomorrowAfternoon: "Tomorrow afternoon",
		twoDaysFromNow: "In a couple of days",
		nextMonday: "Next Monday",
		nextWeek: "In a week",
		inTwoWeeks: "In 2 weeks",
		nextMonth: "In a month",
		inSixMonths: "In 6 months",
		nextYear: "In a year",
		NOVALUE: "---------------",
		specificTime: "At a specific time"
	},
	remindersPopupMonth : {
		'01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
		'05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
		'09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
	},
	remindersPopupDate : {
    '01': '1', '02': '2', '03': '3', '04': '4', '05': '5',
    '06': '6', '07': '7', '08': '8', '09': '9', '10': '10', 
    '11': '11', '12': '12', '13': '13', '14': '14', '15': '15', 
    '16': '16', '17': '17', '18': '18', '19': '19', '20': '20',
	  '21': '21', '22': '22', '23': '23', '24': '24', '25': '25',
	  '26': '26', '27': '27', '28': '28', '29': '29', '30': '30', '31': '31'
	},
	remindersPopupYear : {
	  '2006': '2006', '2007': '2007', '2008': '2008', '2009': '2009', '2010': '2010', '2011': '2011'
	},
	remindersPopupHour : {
    '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', 
    '7': '7', '8': '8', '9': '9', '10': '10', '11': '11', '0': '12'
	},
	remindersPopupMinute : {
    '00': '00', '05': '05', '10': '10', '15': '15', '20': '20', '25': '25',
    '30': '30', '35': '35', '40': '40', '45': '45', '50': '50', '55': '55'
	},
	remindersPopupMeridiem : {
    '0': 'AM', '12': 'PM'
	}
}

/***********************************************************************
/* Setup, Dashboard Accomodations, and Basics
/**********************************************************************/
function setup() {
  DEBUG("------------------ LOADING WIDGET ---------------------");
  document.getElementById("version_number").innerHTML = "v"+VERSION_NUMBER;
  
	if (window.widget) {
		window.expandedWidth = 278;
		window.collapsedWidth = 278;
		window.expandedHeight = 256;
		window.collapsedHeight = 50;
		window.backsideWidth = 278;
		window.backsideHeight = 238;
		with (window) {
			resizeTo(collapsedWidth, collapsedHeight);
		}
		widget.onshow = onshow;
		widget.onhide = onhide;

		checkForGrowl();
		gUsername = widget.preferenceForKey('username');
		gToken = widget.preferenceForKey('token');
		gUseGrowl = widget.preferenceForKey('growl');
	}
	
	//do sanity checking in case this is a new widget instance
	if (gUsername == undefined) {
		gUsername = '';
		document.getElementById('add_button').style.visibility = 'hidden';
	}
	if (gToken == undefined) {
	  gToken = '';
	  document.getElementById('add_button').style.visibility = 'hidden';
	}
	if (gUseGrowl == true) {
	  // update reminders every 45 minutes and display notifications (if any) every 30 seconds.
	  DEBUG("Setup: Setting getRemidners timer.");
	  setTimeout(getReminders, 1000);
	  gGrowlTimer = setInterval(getReminders, 1000 * 60 * 45); 
	  gGrowlTimer_2 = setInterval(sendGrowlNotifications, 1000 * 30);
	}
	
	//give shortcuts to relevant document elements
	window.expanded_top = document.getElementById('expanded_top').style;
	window.slider = document.getElementById('slider').style;
	window.collapsed_bottom = document.getElementById('collapsed_bottom').style;
	window.reminders = document.getElementById('reminders_content');
	window.lists = document.getElementById('lists_content');
	window.notes = document.getElementById('notes_content');
	window.growl = document.getElementById('backGrowl');
	window.info = document.getElementById('info');
	window.front = document.getElementById('front');
	window.back = document.getElementById('back');
	window.lock = document.getElementById('lock');
	
	//add scrollers to content views
	window.reminders.scroller = new Scroller(window.reminders);
	window.lists.scroller = new Scroller(window.lists);
	window.notes.scroller = new Scroller(window.notes);
  
  //add event handlers
  document.addEventListener("mousewheel", Scroller.mouseWheel, false);
  
  //additional setup
  document.getElementById('prefUsername').value = gUsername;
  document.getElementById('prefToken').value = gToken;
  document.getElementById('prefGrowl').checked = gUseGrowl;
	createGenericButton(document.getElementById('backDone'), 'Done', hideBack, 75);
	setupPopupMenu(ReminderPopups);
  getPages();
}
function onshow() {
  gIsShown = true;
  if (!gIsBackShown) {
    getPages();
    refreshView(gCurrentTask);
  }
}
function onhide() {
  gIsShown = false;
}
function showBack() {
	var front = document.getElementById("front");
	var back = document.getElementById("back");

	if (window.widget) {
		widget.prepareForTransition("ToBack");
		window.resizeTo(window.backsideWidth, window.backsideHeight);		
	}

	front.style.display="none";
	back.style.display="block";
	gIsBackShown = true;
		
	if (window.widget)
		setTimeout ('widget.performTransition();', 0);
	
	checkVersionNumber();
}
function hideBack() {
  var username = document.getElementById('prefUsername').value;
  var token = document.getElementById('prefToken').value;
  var usegrowl = document.getElementById('prefGrowl').checked;
  gUsername = username;
  gToken = token;
  gUseGrowl = usegrowl;
  
  //reset APIRequest error status in case positive changes were made
  APIRequest.ERROR_STATUS = false;
  APIRequest.USE_SSL = false;
  setLockDisplay(false);
  gIsBackShown = false;

	if (window.widget) {
	  widget.setPreferenceForKey(username, 'username');
	  widget.setPreferenceForKey(token, 'token');
	  widget.setPreferenceForKey(usegrowl, 'growl');
	  if (usegrowl == true) {
	    registerGrowl();
	    DEBUG("hideBack: (Re)setting getReminders timer.");
	    if (gGrowlTimer != null) {
	      clearInterval(gGrowlTimer);
	      clearInterval(gGrowlTimer2);
	    }
	    setTimeout(getReminders, 1000);
	    gGrowlTimer = setInterval(getReminders, 1000 * 60 * 45);
	    gGrowlTimer2 = setInterval(sendGrowlNotifications, 1000 * 20);
	  } else {
	    if (gGrowlTimer != null) {
	      DEBUG("hideBack: Clearing getReminders timer.");
	      clearInterval(gGrowlTimer);
	      clearInterval(gGrowlTimer2);
	    }
	  }
	  
		window.resizeTo(gIsExpanded ? window.expandedWidth : window.collapsedWidth,
										gIsExpanded ? window.expandedHeight : window.collapsedHeight); 
		widget.prepareForTransition("ToFront");
	}
	
	window.back.style.display="none";
	window.front.style.display="block";
	document.getElementById('fliprollie').style.display = 'none';
	
	if (window.widget) {
		setTimeout ('widget.performTransition();', 0);
	}
	
	// It appears we have a valid account now
	if (gUsername && gToken) {
	  showInfo('');
	  getPages();
	  refreshView(gCurrentTask);
	  document.getElementById('add_button').style.visibility = 'visible';
	}
}
function enterflip(event) {
  document.getElementById('fliprollie').style.display = 'block';
}
function exitflip(event) {
  document.getElementById('fliprollie').style.display = 'none';
}
function mousemove (event) {
  if (!gFlipShown)
  {
    if (animation.timer != null)
    {
      clearInterval(animation.timer);
      animation.timer  = null;
    }
    var starttime = (new Date).getTime() - 13;

    animation.duration = 500;
    animation.starttime = starttime;
    animation.firstElement = document.getElementById ('flip');
    animation.setValue = function(value) {
      document.getElementById('flip').style.opacity = value;
    }
    animation.timer = setInterval ("animate();", 13);
    animation.from = animation.now;
    animation.to = 1.0;
    animate();
    gFlipShown = true;
  }
}
function mouseexit (event) {
  if (gFlipShown) {
    // fade in the info button
    if (animation.timer != null) {
      clearInterval(animation.timer);
      animation.timer  = null;
    }
    var starttime = (new Date).getTime() - 13;

    animation.duration = 500;
    animation.starttime = starttime;
    animation.firstElement = document.getElementById ('flip');
		animation.setValue = function(value) {
		  document.getElementById('flip').style.opacity = value;
		}
    animation.timer = setInterval ("animate();", 13);
    animation.from = animation.now;
    animation.to = 0.0;
    animate();
    gFlipShown = false;
  }
}
function doThisOnReturn(func) {
  key = window.event.keyCode;
  if (key == 13 || key == 3) {
    func();
  }
}
function setupPopupMenu(menu) {
	for (var key in menu) {
		var elem = document.getElementById(key);
		var popupMenu = (elem.getElementsByTagName("select"))[0];
		var popupText = (elem.getElementsByTagName("p"))[0];
		popupMenu.innerHTML = '';
		popupText.innerText = '';
		for (var value in menu[key]) {
			var option = document.createElement("option");
			option.value = value;
			option.innerHTML = menu[key][value];
			popupMenu.appendChild(option);
		}
		popupText.innerText = popupMenu.options[0].text;
		popupMenu.style.display = "block";
	}
}
function getPopupMenu(popup) {
  return document.getElementById(popup).getElementsByTagName('select').item(0);
}
function changePopup(elem) {
	var popupMenu = elem.parentNode;
	var popupText = (popupMenu.getElementsByTagName("p"))[0];
	selected = elem.options[elem.selectedIndex];
	popupText.innerHTML = selected.innerHTML;
}
function setLockDisplay(show) {
  window.lock.style.visibility = ( show==true ) ? "visible" : "hidden";
}
function gotoBackpackPage(){
  if (gUsername.length > 0)
    widget.openURL(( (APIRequest.USE_SSL)?'https':'http' )+'://'+gUsername+'.backpackit.com');
}
function textilize(text) {
  DEBUG("INPUT:\n"+text);
  text = textilizeThis(text);
  text = text.replace(/<a href="(.+?)".*?>(.*)<\/a>/g, "<a href=\"#\" onclick=\"widget.openURL('$1')\">$2</a>");
  text = text.replace(/<img src="(.+?)".*?>/g, "[<a href=\"#\" onclick=\"widget.openURL('$1')\">Image</a>]");
  return text;
}
function checkForGrowl(response) {
  //if Growl is running
  if (typeof(response) != "undefined") {
    if (response.outputString.indexOf('GrowlHelperApp') != -1){
      gIsGrowlReady = true;
      window.growl.style.visibility = "visible";
    } else {
      gIsGrowlReady= false;
      window.growl.style.visibility = "hidden";
    }
  } else {
    var obj = widget.system("/usr/bin/osascript Scripts/CheckForGrowl.scpt", checkForGrowl);
  }
}
function registerGrowl(response) {
  if (typeof(response) != "undefined") {
    return;
  } else {
    var obj = widget.system("/usr/bin/osascript Scripts/RegisterGrowl.scpt", registerGrowl);
  }
}
function sendGrowlNotifications() {
  var reminders = gReminders;
  DEBUG("Checking for Reminders...");
  for (var reminder in gReminders) {
    var date = (gReminders[reminder]).remind_at;
    var content = (gReminders[reminder]).content;
    if (date < (new Date())) {
      DEBUG("Showing Reminder: "+content);
      var obj = widget.system("/usr/bin/osascript Scripts/GrowlReminder.scpt "+content.replace(/([^a-zA-Z0-9])/g, '\\$1'), sendNotification);
      delete gReminders[reminder];
    }
  }
}
function sendNotification(response) {
  return;
}
function getClipboard() {
    var output = widget.system("/usr/bin/osascript Scripts/GetClipboard.scpt", null).outputString;
    DEBUG(output);
    if (typeof(output) != "undefined") {
      DEBUG("OUTPUT EXISTS");
      return output;
    } else {
      DEBUG("NO OUTPUT");
      return '';
    }
}
function xmlEscape(text) {
  text = text.replace(/&/g, "&#38;");
  text = text.replace(/</g, "&lt;");
  text = text.replace(/>/g, "&gt;");
  
  return text;
}
function xmlUnescape(text) {
  text = text.replace(/&#38;/g, "&");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  DEBUG("UNESCAPED TO: "+text);
  return text;
}
function checkVersionNumber() {
  try {
	  var req = new XMLHttpRequest();
	  req.open("GET", 'http://chipt.com/WIDGET_VERSION', true);
	  req.onreadystatechange = function(){
	    if (req.readyState == 4) {
	      var current_version = req.responseText;
	      
	      if (current_version != VERSION_NUMBER) {
	        document.getElementById("versionCheck").innerHTML = '<strong>New</strong> Version: v'+current_version+' [<a href="#" onclick="widget.openURL(\'http://chipt.com/files/Backpack.zip\');">Download</a>]';
          
	      } else {
	        document.getElementById("versionCheck").innerHTML = "";
	      }
	    }
	  }
	  req.send();
  } catch(e) {
    DEBUG("Caught: "+e);
  }
}
function DEBUG(msg) {
  if (!gDebug) return;
  
  if (window.widget) {
    alert(msg);
  }else {
    document.getElementById('debug').innerHTML += "<br />"+msg;
  }
}

/***********************************************************************
/* Task Related Functions (views, task switching, dialogs, actions, etc)
/**********************************************************************/
function collapseView() {
	var step2_setValue = function(animator, value) {
	  window.expanded_top.height = value+'px';
	  window.collapsed_bottom.height = (30-value)+'px';
	}
	var step2 = function() {
	  window.collapsed_bottom.display = 'block';
	  window.slider.display = 'none';
	  if (window.widget) {
	  	with (window) {
	  		resizeTo(collapsedWidth, collapsedHeight);
	  	}
	  }
	  window.animator2 = new Animator(17, 0, 200, step2_setValue, null, null);
	  window.animator2.animate();
	}
	if (!window.animator.timer) {
	  gIsExpanded = false;
	  window.animator = new Animator(0, -205, 750, function(animator, value) {window.slider.top = value+'px';}, null, step2);
	  window.animator.animate();
	}
}
function expandView() {
	var step2 = function() {
	  if (window.widget) {
	  	with (window) {
	  		resizeTo(expandedWidth, expandedHeight);
	  	}
	  }
	  window.collapsed_bottom.display = 'none';
	  window.slider.display = 'block';
	  window.animator = new Animator(-205, 0, 750, function(animator, value) {window.slider.top = value+'px';}, null, null);
	  window.animator.animate();
	  refreshView(gCurrentTask);
	}
	var step1_setValue = function(animator, value) {
	  window.expanded_top.height = value+'px';
	  window.collapsed_bottom.height = (30-value)+'px';
	}
	if (typeof(window.animator) == "undefined" || !window.animator.timer) {
	  gIsExpanded = true;
	  window.animator = new Animator(0, 17, 200, step1_setValue, null, step2);
	  window.animator.animate();	  
	}
}
function refreshView(task) {
  if (task == "reminders") {
    window.reminders.scroller.update();
    getReminders();
  } else if (task == "lists") {
    window.lists.scroller.update();
    getList();
  } else if (task == "notes") {
    window.notes.scroller.update();
    getNotes();
  }
}
function switchTo(task) {
  //don't switch if we're busy expanding or collapsing
  if (typeof(window.animator) != "undefined" && window.animator.timer) return false;
  
	hideDialog(false);
	if (gCurrentTask == task) {
		collapseView();
		gCurrentTask = '';
		gScroller = null;
		document.getElementById('button_'+task).src = 'Images/button_'+task+'_off.png';
	} else {
		var status = 'off';
		for (var i=0; i<gTaskNames.length; i++) {
			status = (gTaskNames[i]==task) ? 'on' : 'off';
			document.getElementById('button_'+gTaskNames[i]).src = 'Images/button_'+gTaskNames[i]+'_'+status+'.png';
			document.getElementById(gTaskNames[i]).style.display = (gTaskNames[i]==task) ? 'block' : 'none';
		}
		gCurrentTask = task;
		gScroller = document.getElementById(task+'_content').scroller;
		if (gIsExpanded == false) {
			expandView();
		} else {
		  refreshView(task);
		}
	}
}
function showDialog(method) {
  if (gIsDialogActive) return;
  
	var theDialog = document.getElementById(gCurrentTask+'_dialog');
	gIsDialogActive = true;
	if (typeof(theDialog.animator)=='undefined') {
		theDialog.style.display = 'block';
		ht = theDialog.offsetHeight * -1;
		theDialog.style.bottom = ht+'px';
		var setValue = function(animator, value) { 
			document.getElementById(gCurrentTask+'_dialog').style.bottom = value+'px';
		}
		theDialog.animator = new Animator(ht, 0, -1.25*ht+300, setValue, null, null);
	}
	
	//initialize dialog state
	var h1 = theDialog.getElementsByTagName('h1').item(0);
	if (method == "edit") {
	  switch (gCurrentTask) {
	  case 'reminders':
	    theDialog.submit = updateReminder;
	    h1.innerHTML = 'Editing Reminder:';
	    break;
	  case 'lists':
	    theDialog.submit = updateListItem;
	    h1.innerHTML = 'Editing List Item:';
	    break;
	  case 'notes':
	    theDialog.submit = updateNote;
	    h1.innerHTML = 'Editing Note:';
	    break;
	  }	  
	} else {
	  DEBUG("Showing 'Add' Dialog for: "+gCurrentTask);
	  switch (gCurrentTask) {
	  case 'reminders':
      theDialog.submit = addReminder;
      h1.innerHTML = 'Add A Reminder:';
      setSpecificTime( new Date() );
	    break;
	  case 'lists':
	    theDialog.submit = addListItem;
	    h1.innerHTML = 'Add A List Item:';
	    break;
	  case 'notes':
	    theDialog.submit = addNote;
	    h1.innerHTML = 'Add A Note:';
	    document.getElementById('notesBodyContent').value = getClipboard();
	    break;
	  }	  
	}
	
	theDialog.animator.onfinish = function() {theDialog.getElementsByTagName('input').item(0).focus();};
	theDialog.animator.animateInDirection(1);
}
function hideDialog(animate) {
	gIsDialogActive = false;
	if (gCurrentTask) {
		var theDialog = document.getElementById(gCurrentTask+'_dialog');
		if (theDialog.animator)
		  theDialog.animator.onfinish = resetDialog;
		if (animate == true) {
			theDialog.animator.animateInDirection(-1);
		} else {
			if (typeof(theDialog.animator) != "undefined") {
				theDialog.animator.setDirection(-1);
				theDialog.animator.setState(1);
			}
		}
	}
}
function resetDialog() {
  gIsDialogActive = false;
  if (gCurrentTask) {
    if (gCurrentTask == "reminders") 
    resetPopups();
    var theDialog = document.getElementById(gCurrentTask+'_dialog');
    if (theDialog.animator)
      theDialog.animator.onfinish = null;
    var inputs = theDialog.getElementsByTagName('input');
    for (var i=0; i<inputs.length; i++) {
      inputs[i].value = '';
    }
    inputs = theDialog.getElementsByTagName('textarea');
    for (i=0; i<inputs.length; i++) {
      inputs[i].value = '';
    }
  }
}
function resetPopups() {
  var popups = new Array('remindersPopupTime', 'remindersPopupMonth', 'remindersPopupDate', 'remindersPopupYear',
                         'remindersPopupHour', 'remindersPopupMinute', 'remindersPopupMeridiem');
  for (var i=0; i<popups.length; i++) {
    thePopup = getPopupMenu(popups[i]);
    thePopup.options[0].selected = true;
    if (popups[i]=='remindersPopupTime') {
      changeTime(thePopup);
    }
    changePopup(thePopup);
  }
}
function changeTime(elem) {
  if (elem.selectedIndex == elem.options.length-1) {
    document.getElementById('remindersSpecificTime').style.visibility = 'visible';
  } else {
    document.getElementById('remindersSpecificTime').style.visibility = 'hidden';
  }
}
function changePage(elem) {
  changePopup(elem);
  setPage(elem.value);
  refreshView(gCurrentTask);
}
function setPage(page) {
  gCurrentPage = page;
  var lists = getPopupMenu('listsPopupPage');
  var notes = getPopupMenu('notesPopupPage');
  lists.value = page;
  notes.value = page;
  changePopup(lists)
  changePopup(notes);
}
function setSpecificTime(date) {
  var the_date = dateToSQLDate( date );
  parts = the_date.split(/ /);
  parts[0] = parts[0].split(/-/);
  parts[1] = parts[1].split(/:/);
  
  var hour = parts[1][0] * 1 > 11 ? parts[1][0]-12 : parts[1][0] * 1;
  var minute = parseInt(parts[1][1]);
  if (minute % 5 > 0)
    minute = minute + (5 - minute % 5);
  if (minute == 60)
    minute = '0';
  minute = minute < 10 ? '0'+minute : minute;
  getPopupMenu('remindersPopupYear').value = parts[0][0];
  getPopupMenu('remindersPopupMonth').value = parts[0][1];
  getPopupMenu('remindersPopupDate').value = parts[0][2];
  getPopupMenu('remindersPopupHour').value = hour
  getPopupMenu('remindersPopupMinute').value = minute;
  getPopupMenu('remindersPopupMeridiem').value = parts[1][0] > 11 ? '12' : '0';

  changePopup( getPopupMenu('remindersPopupYear') );
  changePopup( getPopupMenu('remindersPopupMonth') );
  changePopup( getPopupMenu('remindersPopupDate') );
  changePopup( getPopupMenu('remindersPopupHour') );
  changePopup( getPopupMenu('remindersPopupMinute') );
  changePopup( getPopupMenu('remindersPopupMeridiem') );
}
function showInfo(info, persist) {
  if (typeof(window.info.animator) == "undefined") {
    var setValue = function(animator, value) {window.info.style.opacity = value;};  
    window.info.animator = new Animator(1.0, 0.0, 750, setValue, null, null);
  }
  window.info.animator.setState(0);
  window.info.innerHTML = info;
  if (!persist) {
    window.info.delay = setTimeout(function() {window.info.animator.animate() }, 1200);
  } else {
    clearTimeout(window.info.delay);
  }
}
function showEditButton(elem) {
  var edit = elem.getElementsByTagName("img").item(0);
  if (edit) {
    edit.style.display = "inline-block";
  }
}
function hideEditButton(elem) {
  var edit = elem.getElementsByTagName("img").item(0);
  if (edit) {
    edit.style.display = "none";
  }
}
function editReminder(id) {
  if (gIsDialogActive) return;
  
  window.reminders.edit_id = id;
  setSpecificTime( gReminders[id].remind_at );
  document.getElementById('remindersItemContent').value = gReminders[id].content;
  
  getPopupMenu('remindersPopupTime').value = 'specificTime';
  changePopup( getPopupMenu('remindersPopupTime') );
  changeTime( getPopupMenu('remindersPopupTime') );

  showDialog('edit');
}
function editListItem(id) {
  if (gIsDialogActive) return;
  
  window.lists.edit_id = id;
  document.getElementById('listsItemContent').value = gLists[id].content;
  showDialog('edit');
}
function editNote(id) {
  if (gIsDialogActive) return;
  
  window.notes.edit_id = id;
  document.getElementById('notesTitleContent').value = gNotes[id].title;
  document.getElementById('notesBodyContent').value = xmlUnescape(gNotes[id].content);
  showDialog('edit');
}

/***********************************************************************
/* This section does all the heavy lifting to interact with the API.
/* In other words, this is the fun part...
/**********************************************************************/
function APIRequest(url, data, callback, errorhandler, restMethod) {
	this.username = gUsername;
	this.token = gToken;
	this.url = url;
	this.data = data;
	this.second_try = false;
	APIRequest.USE_SSL = APIRequest.USE_SSL || false;
	APIRequest.ERROR_STATUS = APIRequest.ERROR_STATUS || false;
	var req = null;
	var callback = callback;
	var errorhandler = errorhandler;
	var self = this;

  this.sendRequest = function(useSSL) {
		var url = (useSSL) ? "http://" : "https://";
		url += this.username + ".backpackit.com/";
		url += this.url;

    try {
		  req = new XMLHttpRequest();
		  req.open(restMethod || "POST", url, true);
		  req.setRequestHeader("Content-Type", "text/xml");
		  req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		  req.overrideMimeType("application/xml");
		  req.onreadystatechange = function(){
		    if (req.readyState == 4) {
		      // Because XHR requests follow redirects silently, we have to check the Content-Type
		      // If it is text/html, that means Backpack redirected us to the login page.
		      // This can happen when requesting a non-SSL page on an SSL-enabled account,
		      // as well as when providing invalid API credentials
		      
		      if (req.status == 403 || /text\/html/.test(req.getResponseHeader('Content-Type'))) {
		        if (self.second_try == false) {
	            DEBUG("SWITCHING SSL MODE TO: "+APIRequest.USE_SSL+" on "+self.url);

		          APIRequest.USE_SSL = true;
		          self.second_try = true;
		    	    self.sendRequest( APIRequest.USE_SSL );
	          } else {
	            APIRequest.USE_SSL = false;
  		    	  APIRequest.ERROR_STATUS = true;
  		        if (errorhandler) {
  		    	    errorhandler({url: url, 
  		    	                  response: req.responseXML.getElementsByTagName("response").item(0),
  		    	                  responseText: req.responseText});
  		    	  }
	          }
		      } else if ((restMethod && req.status>=200 && req.status<300) || req.responseXML.getElementsByTagName("response").item(0).getAttribute('success')=='true') {
		        DEBUG("APIRequest: "+self.url+" complete. (SSL: "+APIRequest.USE_SSL+")");		        

		        setLockDisplay(!APIRequest.USE_SSL)
		        if (restMethod)
		          callback({response: req.responseXML});
		        else
  		    	  callback({response: req.responseXML.getElementsByTagName("response").item(0),
  		    	            responseText: req.responseText});
		      } else {
		        if (errorhandler) {
		    	    errorhandler({url: url,
		    	                  response: req.responseXML.getElementsByTagName("response").item(0),
		    	                  responseText: req.responseText});
		    	  }
		      }
		    }
		  }
		  req.send(this.data);
    } catch(e) {
      DEBUG("Caught: "+e);
    }
	}

	this.send = function() {
	  if (APIRequest.ERROR_STATUS)
	    return false;
	  if (!this.username || !this.token) {
	    showInfo("No Account Specified", true);
	    return false;
	  }
		this.sendRequest( APIRequest.USE_SSL );
	}
}
function tokenize(data) {
  return "<request><token>" + gToken + "</token>" + (data || '') + "</request>";
}
function getReminders(args) {
	if (typeof(args) != "undefined" && args.response) {
    var reminders = args.response.getElementsByTagName("reminders").item(0).getElementsByTagName("reminder");
    var content = document.getElementById('reminders_content');
    if (reminders.length == 0) {
      content.innerHTML = '<em class="nothing">No Reminders</em>';
    } else {
      content.innerHTML = '';
    }
    for (var i=0; i<reminders.length; i++) {
      var reminder = document.createElement('dl');
      var title = document.createElement('dt');
      var remind_at = document.createElement('dd');
      var thedate = SQLDateToDate(reminders[i].querySelector('remind_at').textContent);
      var theid = reminders[i].getAttribute('id');
      var thecontent = reminders[i].querySelector('content').textContent;
      reminder.className = 'reminder';
      
      title.onmouseover = function () { showEditButton(this); };
      title.onmouseout = function() { hideEditButton(this) };
      title.innerHTML = thecontent + '<img class="edit" src="Images/edit.gif" onclick="editReminder('+theid+')" />';
      remind_at.innerHTML = relativeToNow( thedate );
      
      reminder.appendChild(title);
      reminder.appendChild(remind_at);
      content.appendChild(reminder);
      
      gReminders[ theid ] = {remind_at: thedate, content: thecontent};
    }
    if (gIsGrowlReady == true) {
      sendGrowlNotifications();
    }
    window.reminders.scroller.update();
	} else {
	  if (gIsGettingPages) {
	    setTimeout(getReminders, 100);
	    return;
	  } else {
	    var theReq = new APIRequest(gToken+'/reminders.xml', '', getReminders, handleError, 'GET');
	    theReq.send();
	  }
	}
}
function addReminder(args) {
	if (typeof(args) != "undefined" && args.response) {
	  showInfo("Reminder Added");
	  getReminders();
	} else {
	  var content = document.getElementById('remindersItemContent').value;
	  var time = getPopupMenu('remindersPopupTime').value;
	  if (content.length > 0 && time != "NOVALUE") {
	    var remind_at = '';
	    if (time == "specificTime") {
	      var year, month, day, hour, minute, meridiem;
	      year      = getPopupMenu('remindersPopupYear').value;
	      month     = getPopupMenu('remindersPopupMonth').value;
	      day       = getPopupMenu('remindersPopupDate').value;
	      hour      = getPopupMenu('remindersPopupHour').value;
	      minute    = getPopupMenu('remindersPopupMinute').value;
	      meridiem  = getPopupMenu('remindersPopupMeridiem').value;
	      var calc_hour = parseInt(hour)+parseInt(meridiem);
	      calc_hour = (calc_hour < 10) ? '0'+calc_hour : calc_hour;
	      remind_at = year+'-'+month+'-'+day+' '+calc_hour+":"+minute;
	    } else {
	      remind_at = dateToSQLDate( eval(time+"( (new Date()) )") );
	    }
	    hideDialog(true);
	    var data = "<reminder>\n<content>"+content+"</content>\n<remind_at>"+remind_at+"</remind_at>\n</reminder>";
	    var theReq = new APIRequest(gToken+'/reminders.xml', data, addReminder, handleError, 'POST');
	    theReq.send();
	  }
	}
}
function updateReminder(args) {
	if (typeof(args) != "undefined" && ('response' in args)) {
	  showInfo("Reminder Updated");
	  getReminders();
	} else {
	  var content = document.getElementById('remindersItemContent').value;
	  var time = getPopupMenu('remindersPopupTime').value;
	  var id = window.reminders.edit_id;
	  if (content.length > 0 && time != "NOVALUE") {
	    var remind_at = '';
	    if (time == "specificTime") {
	      var year, month, day, hour, minute, meridiem;
	      year      = getPopupMenu('remindersPopupYear').value;
	      month     = getPopupMenu('remindersPopupMonth').value;
	      day       = getPopupMenu('remindersPopupDate').value;
	      hour      = getPopupMenu('remindersPopupHour').value;
	      minute    = getPopupMenu('remindersPopupMinute').value;
	      meridiem  = getPopupMenu('remindersPopupMeridiem').value;
	      var calc_hour = parseInt(hour)+parseInt(meridiem);
	      calc_hour = (calc_hour < 10) ? '0'+calc_hour : calc_hour;
	      remind_at = year+'-'+month+'-'+day+' '+calc_hour+":"+minute;
	    } else {
	      remind_at = dateToSQLDate( eval(time+"( (new Date()) )") );
	    }
	    hideDialog(true);
	    var data = "<reminder><content>"+content+"</content><remind_at>"+remind_at+"</remind_at></reminder>";
	    var theReq = new APIRequest(gToken+'/reminders/'+id+'.xml', data, updateReminder, handleError, 'PUT');
	    theReq.send();
	  }
	}
}
function getPages(args) {
	if (typeof(args) != "undefined" && args.response) {
    if (args.response.getAttribute('success') == "true") {
      var pages = args.response.getElementsByTagName("pages").item(0).getElementsByTagName("page");      
      var notes = new Array();
      var lists = new Array();
      var id = 0;
      var small_id = null;
      var title = '';
      for (var i=0; i<pages.length; i++) {
        id = pages[i].getAttribute('id');
        if (small_id == null || id*1 < small_id*1) {
          small_id = id;
        }
        title = pages[i].getAttribute('title');
        DEBUG("GOT PAGE: "+title);
        notes[id] = xmlUnescape(title);
        lists[id] = xmlUnescape(title);
      }
      setupPopupMenu({notesPopupPage : notes, listsPopupPage : lists});
      
      if (notes[gCurrentPage]) {
        setPage(gCurrentPage);
      } else {
        setPage(small_id);
      }
      gIsGettingPages = false;
    }
	} else {
	  if (gUsername && gToken) {
	    document.getElementById('listsPopupPage').getElementsByTagName('p').item(0).innerText = 'loading...';
	    document.getElementById('notesPopupPage').getElementsByTagName('p').item(0).innerText = 'loading...';
	    
	  }
	  gIsGettingPages = true;
	  var theReq = new APIRequest('ws/pages/all', tokenize(), getPages, handleError);
	  theReq.send();
	}
}
function getList(args) {
	if (typeof(args) != "undefined" && args.response) {
	  if (args.response.getAttribute('success') == "true") {
	    var items = args.response.getElementsByTagName("items").item(0).getElementsByTagName("item");
	    var complete = document.getElementById('listComplete');
	    var incomplete = document.getElementById('listIncomplete');
	    var li = '';
	    complete.innerHTML = '';
	    incomplete.innerHTML = '';
	    if (items.length == 0) {
	      complete.innerHTML = '<li><em class="nothing">No Items</em></li>';
	    }
	    gLists = new Array();
	    for (var i=0; i<items.length; i++) {
	      gLists[ items[i].getAttribute('id') ] = {content: items[i].firstChild.data};
	      li  = '<div class="checkbox" onclick="if (!gIsDialogActive) toggleListItem({page: '+gCurrentPage+', id:'+items[i].getAttribute('id')+'})"></div>';
	      li += '<div class="item">'+textilize(items[i].firstChild.data)+'</div>';
	      if (items[i].getAttribute('completed')=='true') {
	        complete.innerHTML += '<li>'+li+'</li>';
	      } else {
	        incomplete.innerHTML += '<li onmouseover="showEditButton(this)" onmouseout="hideEditButton(this)">'+li+'<img class="edit" src="Images/edit.gif" onclick="editListItem('+items[i].getAttribute('id')+')" /></li>';
	      }
	    }
	    window.lists.scroller.update();
	  }
	} else {
	  if (gIsGettingPages) {
	    setTimeout(getList, 100);
	    return;
	  } else {
	    var theReq = new APIRequest('ws/page/'+gCurrentPage+'/items/list', tokenize(), getList, handleError);
	    theReq.send();
	  }
	}
}
function addListItem(args) {
	if (typeof(args) != "undefined" && args.response) {
	  if (args.response.getAttribute('success') == "true") {
	    showInfo("List Item Added");
	    getList();
	  }
	} else {
	  var content = document.getElementById('listsItemContent').value;
	  if (content.length > 0) {
	    hideDialog(true);
	    var data = '<item><content>'+content+'</content></item>';
	    var theReq = new APIRequest('ws/page/'+gCurrentPage+'/items/add', tokenize(data), addListItem, handleError);
	    theReq.send();
	  }
	}
}
function toggleListItem(args) {
	if (typeof(args) != "undefined" && args.response) {
	  if (args.response.getAttribute('success') == "true") {
	    getList();
	  }
	} else {
	  var theReq = new APIRequest('ws/page/'+args.page+'/items/toggle/'+args.id, tokenize(), toggleListItem, handleError);
	  theReq.send();
	}
}
function updateListItem(args) {
	if (typeof(args) != "undefined" && args.response) {
	  if (args.response.getAttribute('success') == "true") {
	    showInfo("List Item Updated");
	    getList();
	  }
	} else {
	  var content = document.getElementById('listsItemContent').value;
	  var id = window.lists.edit_id;
	  if (content.length > 0) {
	    hideDialog(true);
	    var data = '<item><content>'+content+'</content></item>';
	    var theReq = new APIRequest('ws/page/'+gCurrentPage+'/items/update/'+id, tokenize(data), updateListItem, handleError);
	    theReq.send();
	  }
	}
}
function getNotes(args) {
	if (typeof(args) != "undefined" && args.response) {
		if (args.response.getAttribute('success') == "true") {
		  var notes = args.response.getElementsByTagName("notes").item(0).getElementsByTagName("note");
		  var notes_area = document.getElementById('notes_content');
		  notes_area.innerHTML = '';
		  if (notes.length == 0) {
		    notes_area.innerHTML = '<em class="nothing">No Notes</em>';
		  }
		  gNotes = new Array();
		  
		  for (var i=0; i<notes.length; i++) {
		    var note_tag = document.createElement('dl');
		    var title = document.createElement('dt');
		    var body = document.createElement('dd');
		    var posted_date = postedDate( SQLDateToDate(notes[i].getAttribute('created_at'), true) );
		    var body_content = (notes[i].firstChild != null) ? notes[i].firstChild.data : '';
		    
		    gNotes[ notes[i].getAttribute('id') ] = {title: notes[i].getAttribute('title'), content: body_content };
		    note_tag.className = 'note';
		    title.onmouseover = function () { showEditButton(this); };
		    title.onmouseout = function() { hideEditButton(this) };
		    title.innerHTML = textilize(notes[i].getAttribute('title'))+' <span>Posted '+posted_date+'</span>';
		    title.innerHTML += '<img class="edit" src="Images/edit.gif" onclick="editNote('+notes[i].getAttribute('id')+')" />';
		    body.innerHTML = '<p>'+textilize(body_content)+'</p>';
		    note_tag.appendChild(title);
		    note_tag.appendChild(body);
		    notes_area.appendChild(note_tag);
		  }
		  window.notes.scroller.update();
		}
	} else {
	  if (gIsGettingPages) {
	    setTimeout(getNotes, 100);
	    return;
	  } else {
	    var theReq = new APIRequest('ws/page/'+gCurrentPage+'/notes/list', tokenize(), getNotes, handleError);
	    theReq.send();
	  }
	}
}
function addNote(args) {
	if (typeof(args) != "undefined" && args.response) {
	  if (args.response.getAttribute('success') == "true") {
	    showInfo("Note Added");
	    getNotes();
	  }
	} else {
	  var title = document.getElementById('notesTitleContent').value;
	  var body = document.getElementById('notesBodyContent').value;
	  if (title.length > 0 || body.length > 0) {
	    hideDialog(true);
	    var data = '<note>';
	    data += (title.length > 0) ? '<title>'+xmlEscape(title)+'</title>' : '';
	    data += (body.length > 0) ? '<body>'+xmlEscape(body)+'</body>' : '';
	    data += '</note>';
	    var theReq = new APIRequest('ws/page/'+gCurrentPage+'/notes/create', tokenize(data), addNote, handleError);
	    theReq.send();
	  }
	}
}
function updateNote(args) {
	if (typeof(args) != "undefined" && args.response) {
		if (args.response.getAttribute('success') == "true") {
		  showInfo("Note Updated");
		  getNotes();
		}
	} else {
	  var title = document.getElementById('notesTitleContent').value;
	  var body = document.getElementById('notesBodyContent').value;
	  var id = window.notes.edit_id;
	  if (title.length > 0 || body.length > 0) {
	    hideDialog(true);
	    var data = '<note>';
	    data += (title.length > 0) ? '<title>'+xmlEscape(title)+'</title>' : '';
	    data += (body.length > 0) ? '<body>'+xmlEscape(body)+'</body>' : '';
	    data += '</note>';
	    var theReq = new APIRequest('ws/page/'+gCurrentPage+'/notes/update/'+id, tokenize(data), updateNote, handleError);
	    theReq.send();
	  }
	}
}
function handleError(args) {
  if (args.response == null) {
    DEBUG("ERROR (403) IN "+args.url+": Not Authorized");
		showInfo('Login Error. Check your info&hellip;', true);    
  } else {
  	var error = args.response.getElementsByTagName("error")[0];
    DEBUG("ERROR ("+error.getAttribute('code')+") IN "+args.url+": "+error.firstChild.data);
    gIsGettingPages = false;
  	switch(error.getAttribute('code')) {
  		case '404':
  			showInfo('Resource Not Found (404)', true);
  			break;
  		case '500':
  			showInfo('Application Error (500)', true);
  			break;
  		default:
  			showInfo('An unknown error occured', true);
  	}
  }
}

/***********************************************************************
/* This section deals with date manipulation for use with reminders.
/* It contains functions to handle and show fuzzy or relative dates,
/* and to take care of UI<->API conversions.
/**********************************************************************/
function dateToSQLDate(date) { 
  /* Accepts a JS Date and returns a SQL-style date string */
	/* Format: YYYY-MM-DD hh:mm */

	var out = '';
	out  = date.getFullYear()+'-';
	out += ((date.getMonth()+1 < 10) ? '0'+(date.getMonth()+1) : date.getMonth()+1)+'-';
	out += ((date.getDate() < 10) ? '0'+date.getDate() : date.getDate())+' ';
	out += ((date.getHours() < 10) ? '0'+date.getHours() : date.getHours())+':';
	out += ((date.getMinutes() < 10) ? '0'+date.getMinutes() : date.getMinutes());

	return out;
}
function SQLDateToDate(date, is_offset) {
  /* Accepts a SQL-style date string (UTC) and returns a JS Date (local time)*/
	var parts = new Array();
	parts = date.split(/ /);
	parts[0] = parts[0].split(/-/);
	parts[1] = parts[1].split(/:/);
	parts[0][1]--;
	var toDate = new Date(parts[0][0], parts[0][1], parts[0][2],
												parts[1][0], parts[1][1], parts[1][2]);
	if (is_offset)
	  toDate.setHours( toDate.getHours() - (toDate.getTimezoneOffset()/60) );
	  
	return toDate;
}
function laterToday(date) { /* 3 hours from now */
	date.setHours( date.getHours() + 3 );
	date.setSeconds( 0 );
	return date; 
}
function tomorrowMorning(date) { /* 9AM tomorrow */
	date.setDate( date.getDate() + 1 );
	date.setHours( 9 );
	date.setMinutes( 0 );
	date.setSeconds( 0 ); 
	return date; 
}
function tomorrowAfternoon(date) { /* 2PM tomorrow */
	date.setDate( date.getDate() + 1 );
	date.setHours( 14 );
	date.setMinutes( 0 );
	date.setSeconds( 0 ); 
	return date; 
}
function twoDaysFromNow(date) { /* 48 hours from now */
	date.setHours( date.getHours() + 48 );
	date.setSeconds( 0 ); 
	return date; 
}
function nextMonday(date) { /* 9AM on next monday */
	date.setHours( 9 );
	date.setMinutes( 0 );
	date.setSeconds( 0 ); 
	do {
		date.setDate( date.getDate() + 1 );
	} while (date.getDay() != 1);
	return date; 
}
function nextWeek(date) { /* 7 days from now */
	date.setHours( 9 );
	date.setMinutes( 0 );
	date.setSeconds( 0 ); 
	date.setDate( date.getDate() + 7 );
	return date; 
}
function inTwoWeeks(date) { /* 14 days from now */
	date.setHours( 9 );
	date.setMinutes( 0 );
	date.setSeconds( 0 ); 
	date.setDate( date.getDate() + 14 );
	return date; 
}
function nextMonth(date) { /* 30 days from now */
	date.setHours( 9 );
	date.setMinutes( 0 );
	date.setSeconds( 0 ); 
	date.setDate( date.getDate() + 30 );
	return date; 
}
function inSixMonths(date) { /* 6 months from now */
	date.setHours( 9 );
	date.setMinutes( 0 );
	date.setSeconds( 0 ); 
	date.setMonth( date.getMonth() + 6 );
	return date; 
}
function nextYear(date) { /* 12 months from now */
	date.setHours( 9 );
	date.setMinutes( 0 );
	date.setSeconds( 0 ); 
	date.setFullYear( date.getFullYear() + 1 );
	return date; 
}
function relativeToNow(date) {
	var now = new Date();
	var tomorrow = new Date(now);
	var daysOfWeek = new Array("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat");
	var monthsOfYear = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
	var hours = date.getHours();
	var mins = date.getMinutes();
	var meridiem = (hours<12) ? 'AM' : 'PM';
	hours = (hours>12) ? hours-12 : ((hours == 0 ) ? 12 : hours);
	mins = (mins<10) ? '0'+mins : mins;

	tomorrow.setDate( tomorrow.getDate() + 1 );
	tomorrow.setHours( 0 );
	tomorrow.setMinutes( 0 );
	tomorrow.setSeconds( 0 );
	tomorrow.setMilliseconds( 0 );

	diff = Math.round((date.getTime() - now.getTime()) * 0.001 ); /* in seconds */

	if (diff > 0) { /* date is in the future */
		if (diff < 60) {
			out = '<strong>In less than a minute</strong>';
		} else if (diff >= 60 && diff < 90) {
			out = '<strong>In 1 minute</strong>'; 
		} else if (diff < 50 * 60) {
			out = '<strong>In '+Math.round(diff / 60)+' minutes</strong>';
		} else if (diff >= 50 * 60 && diff < 90 * 60) {
			out = '<strong>In about 1 hour</strong>';
		} else if (diff >= 90 * 60 && date.getTime() < tomorrow.getTime()) {
			out = '<strong>In about '+Math.round(diff / 60 / 60)+' hours</strong>';
		} else if (date.getTime() >= tomorrow.getTime() && 
							 date.getTime() <  tomorrow.getTime()+(24 * 60 * 60 * 1000)) {
			out = 'Tomorrow at '+hours+':'+mins+' '+meridiem;
		} else {
			var year = (date.getFullYear() > now.getFullYear()) ? ', '+date.getFullYear() : '';			
			out  = daysOfWeek[ date.getDay() ]+', '+monthsOfYear[ date.getMonth() ]+' '+date.getDate()+year;
			if (date.getTime() < tomorrow.getTime()+(48 * 60 * 60 * 1000)) { /* show time if date is less than 48 hours away */
				out += ' at '+hours+':'+mins+' '+meridiem;
			}
		}
	} 
	else { /* date is in the past */
		out = date.getDate()+" "+monthsOfYear[ date.getMonth() ];
		if (date.getFullYear() < now.getFullYear()) {
		  out += ", "+date.getFullYear();
		}
	}
	return out;
}
function postedDate(date) {
  var monthsOfYear = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
  var now = new Date();
  var out = date.getDate()+" "+monthsOfYear[ date.getMonth() ];
  if (date.getFullYear() < now.getFullYear()) {
    out += ", "+date.getFullYear();
  }
  return out;
}

/***********************************************************************
/* This section gives the widget the ability to use scroll bars and
/* scroll content using normal means including a mouse wheel.
/**********************************************************************/
function Scroller(elem) 
{
  this.content = elem;
  this.scroller = null;
  this.track = null;
  this.thumb = null;
  this.thumb_travel = null;
  this.content_top = null;
  this.content_height = null;
  this.view_height = null;
  this.scroller_height = null;
  this.thumb_top = null;
  this.thumb_height = null;
  
  //function mappings
  this.update = update;
  this.hide = hide;
  this.show = show;
  this.mouseDownTrack = mouseDownTrack;
  this.mouseUpTrack = mouseUpTrack;
  this.mouseMoveTrack = mouseMoveTrack;
  this.mouseOutTrack = mouseOutTrack;
  this.mouseOverTrack = mouseOverTrack;
  this.mouseDownThumb = mouseDownThumb;
  this.mouseUpThumb = mouseUpThumb;
  this.mouseMoveThumb = mouseMoveThumb;
  this.updateTrackMouseY = updateTrackMouseY;
  this.scrollContent = scrollContent;
  this.thumbPositionForPagePosition = thumbPositionForPagePosition;
  this.pagePositionForThumbPosition = pagePositionForThumbPosition;
  this.pageUp = pageUp;
  this.pageDown = pageDown;
  
  //create the scroller elements
  var scroller = document.createElement('div');
  scroller.id = this.content.id+'_scroller';
  scroller.className = 'scroller';
  var track = document.createElement('div');
  track.onmousedown = function(e) { gScroller.mouseDownTrack(e) };
  track.innerHTML = '<div class="scroll_track_top"></div><div class="scroll_track_mid"></div><div class="scroll_track_bot"></div>';
  track.mid_div = mid_div;
  track.top_div = top_div;
  track.bot_div = bot_div;
  var thumb = document.createElement('div');
  thumb.className = 'scroll_thumb';
  thumb.onmousedown = function(e) { gScroller.mouseDownThumb(e); };
  thumb.innerHTML = '<div class="scroll_thumb_top"></div><div class="scroll_thumb_mid"></div><div class="scroll_thumb_bot"></div>';
  this.scroller = scroller;
  this.track = track;
  this.thumb = thumb;
  
  //add the scroller to the DOM
  this.scroller.appendChild(this.track);
  this.scroller.appendChild(this.thumb);
  this.content.parentNode.appendChild(this.scroller);
  
  this.hide();

  /************************************************/
  
  function top_div() {
    return this.getElementsByTagName('div').item(0);
  }
  function mid_div() {
    return this.getElementsByTagName('div').item(1);
  }
  function bot_div() {
    return this.getElementsByTagName('div').item(2);
  }
  function update() {
    if (!gIsShown || gIsDialogActive || !gIsExpanded || this != gScroller) return;
    
    this.content_top = parseInt(getStyle(this.content, 'top'));
    this.content_height = this.content.offsetHeight; //parseInt(getStyle(this.content, 'height'));
    this.view_height = parseFloat(getStyle(this.content.parentNode, 'height'));
    this.scroller_height = parseInt(getStyle(this.scroller, 'height'));
    var percent = getProportion(this.view_height, this.content_height);

    //Hide the scrollbar if all the content is showing.
    if (percent == 0) {
    	this.hide();
    } else {
      // thumb height is constrained to its CSS min-height value;
    	this.thumb_height = Math.round(this.scroller_height * percent);
    	this.thumb_travel = this.scroller_height - this.thumb_height;
    	this.thumb.style.height = this.thumb_height + 'px';
    	this.thumb_top = this.thumbPositionForPagePosition(this.content_top);
    	this.thumb.style.top = this.thumb_top + 'px';

      this.show();
    	this.scrollContent(0);
    }
  }
  function hide() {
    this.content.style.right = '0px';
    this.scroller.style.visibility = "hidden";
  }
  function show() {
    this.content.style.right = '22px';
    this.scroller.style.visibility = "visible";
    
    if (this.content.offsetHeight > this.content_height) {
      this.update();
    }
  }
  function mouseDownTrack(e) {
    if (gIsDialogActive) return;
    
    gScroller.track_y = gScroller.updateTrackMouseY(e);
    gScroller.tracking = true;
    
    gScroller.track.addEventListener("mousemove", gScroller.mouseMoveTrack, false);
    gScroller.track.addEventListener("mouseover", gScroller.mouseOverTrack, false);
    gScroller.track.addEventListener("mouseout", gScroller.mouseOutTrack, false);
    document.addEventListener("mouseup", gScroller.mouseUpTrack, true);
    
    if (gScroller.track_y > gScroller.thumb_top) {
    	gScroller.pageDown();
    	if (gScroller.timer) {
    	  clearInterval(gScroller.timer);
    	}
    	gScroller.timer = setInterval(function(){gScroller.pageDown();}, 150);
    } else {
    	gScroller.pageUp();
    	if (gScroller.timer) {
    	  clearInterval(gScroller.timer);
    	}
    	gScroller.timer = setInterval(function(){gScroller.pageUp();}, 150);
    }
  }
  function mouseUpTrack(e) {
    if (gIsDialogActive) return;
    
  	clearInterval(gScroller.timer);
  	gScroller.track.removeEventListener("mousemove", this.mouseMoveTrack, false);
  	gScroller.track.removeEventListener("mouseover", this.mouseOverTrack, false);
  	gScroller.track.removeEventListener("mouseout", this.mouseOutTrack, false);
  	document.removeEventListener("mouseup", gScroller.mouseUpTrack, true);
  }
  function mouseMoveTrack(e) {
    if (gIsDialogActive) return;
    
    gScroller.track_y = gScroller.updateTrackMouseY(e);
  }
  function mouseOutTrack(e) {
    if (gIsDialogActive) return;
  	
  	gScroller.tracking = false;
  }
  function mouseOverTrack(e) {
    if (gIsDialogActive) return;
  	
  	gScroller.tracking = true;
  }
  function updateTrackMouseY(e) {
    //We need to do this because the source of the offsetY value is not the track div, but one of
    //the three divs inside the track (top, middle, bottom). This is all to determine whether or
    //not the track click was above or below the thumb.
    
    if (e.toElement == track.mid_div()) {
    	return e.offsetY + parseInt(getStyle(track.top_div(), 'height'));
    } else if (e.toElement == track.bot_div()) {
    	return e.offsetY + parseInt(getStyle(track.mid_div(), 'height')) + parseInt(getStyle(track.top_div(), 'height'));
    } else {
    	return e.offsetY - (e.toElement.offsetTop + e.toElement.parentNode.offsetTop);
    }
  }
  function mouseDownThumb(e) {
    if (gIsDialogActive) return;
    
    document.addEventListener("mousemove", gScroller.mouseMoveThumb, true);
    document.addEventListener("mouseup", gScroller.mouseUpThumb, true);

    gScroller.thumb_y = e.y;
    gScroller.thumb_start = parseInt(getStyle(gScroller.thumb, 'top'));
  }
  function mouseUpThumb(e) {
    if (gIsDialogActive) return;
    
    document.removeEventListener("mousemove", gScroller.mouseMoveThumb, true);
    document.removeEventListener("mouseup", gScroller.mouseUpThumb, true);
  }
  function mouseMoveThumb(e) {
    if (gIsDialogActive) return;
    
    var delta = e.y - gScroller.thumb_y;
    gScroller.scrollContent( gScroller.thumb_start + delta );
  }
  function mouseWheel(e) {
    if (gIsDialogActive) return;
    
    if (gScroller && gScroller.scroller.style.visibility == "visible") {
      var delta = e.wheelDelta / 9;
      gScroller.content_top = gScroller.content_top + delta;
    	gScroller.scrollContent( gScroller.thumbPositionForPagePosition(gScroller.content_top) );
    }
  }
  function thumbPositionForPagePosition(page_position) {
  	return -page_position / ((this.content_height - this.view_height) / this.thumb_travel);
  }
  function pagePositionForThumbPosition(thumb_position) {
  	return -thumb_position * ((this.content_height - this.view_height) / this.thumb_travel);
  }
  function scrollContent(thumb_position) {
  	if (thumb_position < 0) {
  		thumb_position = 0;
  	} else if (thumb_position > this.thumb_travel) {
  		thumb_position = this.thumb_travel;
  	}
    
    this.thumb_top = thumb_position;
    this.thumb.style.top = thumb_position+'px';

  	this.content_top = this.pagePositionForThumbPosition(thumb_position);
  	this.content.style.top = this.content_top + 'px';
  }
  function pageUp() {
    if (!this.tracking) return;

    if (this.track_y < this.thumb_top) {
      //pageUp only if the mouse is currently above the top of the thumb
      this.content_top = parseInt(getStyle(this.content, 'top'));
      var firstPageY = 0;
      var nextPageY = this.content_top + this.view_height;
      this.content_top = Math.min(firstPageY, nextPageY);
      this.content.style.top = this.content_top + 'px';
      
      var newThumbTop = this.thumbPositionForPagePosition(this.content_top);
      this.thumb_top = newThumbTop;
      this.thumb.style.top = newThumbTop;
    }
  }
  function pageDown() {
    if (!this.tracking) return;
    
    if (this.track_y > this.thumb_top+this.thumb_height) {
      //pageDown only if the mouse is currently below the bottom of the thumb
      this.content_top = parseInt(getStyle(this.content, 'top'));
      var lastPageY = -(this.content_height - this.view_height);
      var nextPageY = this.content_top - this.view_height;
      this.content_top = Math.max(lastPageY, nextPageY);
      this.content.style.top = this.content_top+ 'px';

      var newThumbTop = this.thumbPositionForPagePosition(this.content_top);
      this.thumb_top = newThumbTop;
      this.thumb.style.top = newThumbTop + 'px';
    }
  }

  function getStyle(elem, prop) {
    return (document.defaultView.getComputedStyle(elem,'')).getPropertyValue(prop);
  }
  function getProportion(view, content) {
    if (content <= view)
    	return 0;
    else
      return view / content;
  }
  
}