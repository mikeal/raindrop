dojo.provide("rd.friendly");

dojo.require("dojox.date.posix");

(function(){
  var posix = dojox.date.posix;

  rd.friendly = {
    timestamp: function(timestamp) {
      return rd.friendly.date(new Date(timestamp * 1000));
    },
  
    date: function(date) {
      var diff = (((new Date()).getTime() - date.getTime()) / 1000),
      day_diff = Math.floor(diff / 86400);
      var dObj = { "friendly" : date.toLocaleDateString(), 
                   "additional" : date.toLocaleTimeString(),
                   "utc" : date.toUTCString() };
  
      /* some kind of error */
      if ( isNaN(day_diff) || day_diff < 0)
        return date.toString();
  
      if ( day_diff == 0 ) {
        /* XXX hack %I to strip the leading zeros that we don't want */
        dObj["additional"] = posix.strftime(date, "%I:%M%p").replace(/^0?/,'');
        if ( diff < 60 ) {
          dObj["friendly"] = "just now"
          return dObj;
        }
        if ( diff < 120 + 30 ) { /* 1 minute plus some fuzz */
          dObj["friendly"] = "a minute ago";
          return dObj;
        }
        if ( diff < 3600 ) {
          dObj["friendly"] = Math.floor( diff / 60 ) + " minutes ago";
          return dObj;
        }
        if ( diff < (60 * 60) * 2 ) {
          dObj["friendly"] = "1 hour ago";
          return dObj;
        }
        if ( diff < 24 * 60 * 60 ) {
          dObj["friendly"] = Math.floor( diff / 3600 ) + " hours ago";
          return dObj;
        }
      }
      if ( day_diff == 1 ) {
        /* XXX hack %I to strip the leading zeros that we don't want */
        dObj["additional"] = posix.strftime(date, "%I:%M%p").replace(/^0?/,'');
        dObj["friendly"] = "yesterday";
        return dObj;
      }
      if ( day_diff < 7 ) {
        /* for this scope: we want only the day of week */
        dObj["additional"] = posix.strftime(date, "%A");
        dObj["friendly"] = day_diff + " days ago";
        return dObj;
      }
      if ( day_diff < 8 ) {
        /* for this scope: we want the day of week and the date */
        dObj["additional"] = posix.strftime(date, "%A %B %e");
        dObj["friendly"] = "last week";
        return dObj;
      }
      /* for this scope: we want day of week and the date 
         plus the month (if different) */
      if ( day_diff < 31 ) {
        dObj["additional"] = posix.strftime(date, "%A %B %e");
        dObj["friendly"] = Math.ceil( day_diff / 7 ) + " weeks ago";
        return dObj;
      }
  
      /* for this scope: we want month + date */
      if ( day_diff < 62 ) {
        dObj["additional"] = posix.strftime(date, "%b %e");
        dObj["friendly"] = "a month ago";
        return dObj;
      }
      if ( day_diff < 365 ) {
        dObj["additional"] = posix.strftime(date, "%b %e");
        dObj["friendly"] = Math.ceil( day_diff / 31 ) + " months ago";
        return dObj;
      }
  
      /* for this scope: we want month + year */
      if ( day_diff >= 365 && day_diff < 730 ) {
        dObj["additional"] = date.toLocaleDateString()
        dObj["friendly"] = "a year ago";
        return dObj;
      }
      if ( day_diff >= 365 ) {
        dObj["additional"] = date.toLocaleDateString()
        dObj["friendly"] = Math.ceil( day_diff / 365 ) + " years ago";
        return dObj;
      }
      return dObj;
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
})();
