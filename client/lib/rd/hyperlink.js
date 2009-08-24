dojo.provide("rd.hyperlink");

rd.hyperlink = {
  add: function(/*String*/text) {
    //summary: tries to find hyperlinks in the text and adds an anchor for them,
    //by default making the link open in a new window.
    //TODO: need to make this more robust. Woefully inadequate.
    //Needs to account for things already hyperlinked, and needs to be more robust
    //on testing the end of a hyperlink. Also test for things like mozilla.com, without
    //protocol on the front.
    //TODO: using single quotes on the href attributes due to an escape thing with
    //dijits, but should be able to sort that out in near future.
    return text.replace(/http(s)?:\S+/g, "<a href='$&' target='_blank'>$&</a>");
  },

  addTwitterUsers: function(/*String*/text) {
    //summary: adds hyperlinks to twitter user IDs. TODO: probably needs to be
    //more robust.
    return text.replace(/\@(\w+)/g, "<a class='username' type='twitter' title='twitter.com/$1' href='http://twitter.com/$1' target='_blank'>@$1</a>");
  },
  addTwitterTags: function(/*String*/text) {
    //summary: adds hyperlinks to twitter tags
    // TODO: we evetually want to link to our own tag search/browse system that 
    // works to pull in the twitter search as well
    return text.replace(/\#(\w+)/g, "<a class='tag' type='twitter' title='search twitter.com for tag #$1' href='http://search.twitter.com/search?q=%23$1' target='_blank'>#$1</a>");
  }
}
