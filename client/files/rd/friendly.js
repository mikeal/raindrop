dojo.provide("rd.friendly");

rd.friendly = {
  timestamp: function(timestamp) {
    return rd.friendly.date(new Date(timestamp * 1000));
  },

  date: function(date) {
  	var diff = (((new Date()).getTime() - date.getTime()) / 1000),
  		day_diff = Math.floor(diff / 86400);
  			
  	if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 365 )
  		return date.toString();
  			
  	return day_diff == 0 && (
  			diff < 60 && "just now" ||
  			diff < 120 && "1 minute ago" ||
  			diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
  			diff < 7200 && "1 hour ago" ||
  			diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
  		day_diff == 1 && "Yesterday" ||
  		day_diff < 7 && day_diff + " days ago" ||
  		day_diff < 8 && Math.ceil( day_diff / 7 ) + " week ago" ||
  		day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago" ||
  		day_diff < 62 && Math.floor( day_diff / 31 ) + " month ago" ||
  		day_diff < 365 && Math.ceil( day_diff / 31 ) + " months ago";
  
    return date.toString();
  },

  name: function(name) {
    var firstName = name.split(' ')[0];
    if (firstName.indexOf('@') != -1)
        firstName = firstName.split('@')[0];
    firstName = firstName.replace(" ", "");
    firstName = firstName.replace("'", "");
    firstName = firstName.replace('"', "");
    return firstName;
  }  
};
