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
  }

}
