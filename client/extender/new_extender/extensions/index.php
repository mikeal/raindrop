<?php include $_SERVER["DOCUMENT_ROOT"] . "/menu.php"; ?>
  
  <div id="c2">
    <div class="contentBox">
      <p class="title" style="display:inline-block">Create new extension</p> <div style="text-decoration:blink; display: inline-block; font-variant: small-caps;">contribute*</div><br>
      What name do you want for your extension? (alphanumerics and underscores only, please)<br>
      <input class="name" type="text" value="Extension name"/> <input class="button" type="button" value="create extension"> 
      <div class="small">*you may also clone an extension from the following lists</div>
      
      <p class="title">&mdash; front end extensions</p>
      <ul>
      <li><a href="editor" target="_blank">rdw.ext.MailingList</a> extends: inflow, rd.MegaviewStore, rd.conversation, rdw.DataSelector, rdw.Organizer, rdw.Stories, rdw.Summary</li>
      <li><a href="#">rdw.ext.MessageDebug</a> extends: rdw.Message</li>
      <li><a href="#">rdw.ext.TwitterMessage</a> extends: rdw.Message</li>
      <li><a href="#">rdw.ext.youTubeMessage</a> extends: rdw.Message</li>
      <li><a href="#">rd.ext.core.id-to-skypeid</a> runs after: rd.identity.exists. Creates 'rd.identity.skype' and rd.identity schemas</li>
      <li><a href="#">rd.ext.core.id-to-twitterid</a> runs after: rd.identity.exists. Creates 'rd.identity.twitter' schema</li>
      <li><a href="#">rd.ext.core.imap-flags-to-common</a> runs after: rd.imap.mailbox-cache. Creates 'rd.msg.unseen schemas</li>
      <li><a href="#">rd.ext.core.msg-body-to-youtubed</a> runs after: rd.msg.body. Uses http://gdata.youtube.com/feeds/api/videos/ to create 'rd.msg.body.youtubed' schemas for emails...</li>
      <li><a href="#">rd.ext.core.msg-dsn-to-notification</a> runs after: rd.msg.email. Creates 'rd.msg.conversation' schemas for Delivery Status Notifications...</li>
      <li><a href="#">rd.ext.core.msg-email-to-body</a> runs after: rd.msg.email. Creates 'rd.msg.body' schemas for emails...</li>
      </ul>
      
    </div>
    
    <div class="contentBoxRight">
      <p class="title">&mdash; back end extensions</p>
      <ul>
      <li><a href="#">rd.ext.core.msg-email-to-convo</a> runs after: rd.msg.email. Creates 'rd.msg.conversation' schemas for emails...</li>
      <li><a href="#">rd.ext.core.msg-email-to-mailinglist</a> runs after: rd.msg.email. Creates 'rd.mailing-list' schemas for mailing lists and 'rd.msg.email.mailing-list' schemas for emails...</li>
      <li><a href="#">rd.ext.core.msg-email-to-recip-target</a> runs after: rd.msg.body. Creates 'rd.msg.recip-target' schemas for emails...</li>
      <li><a href="#">rd.ext.core.msg-flags-to-imap</a> runs after: rd.msg.seen. Creates outgoing imap flags changes ready for syncing.</li>
      <li><a href="#">rd.ext.core.msg-rfc-to-email</a> runs after: rd.msg.rfc822. Creates 'rd.msg.email' schemas from raw rfc822 streams</li>
      <li><a href="#">rd.ext.core.msg-rssitem-to-body</a> runs after: rd.raw.rss-entry. Creates 'rd.msg.body' schemas for rss feed entries</li>
      <li><a href="#">rd.ext.core.msg-skype-to-common</a> runs after: rd.msg.skypemsg.raw. Creates 'rd.msg.body' and convo schemas for skype msgs</li>
      <li><a href="#">rd.ext.core.msg-skype-to-recip-target</a> runs after: rd.msg.skypemsg.raw. Creates 'rd.msg.recip-target' schemas for skype messages</li>
      <li><a href="#">rd.ext.core.msg-tweet-to-common</a> runs after: rd.msg.tweet.raw. Creates 'rd.msg.body' and convo schemas for skype msgs</li>
      <li><a href="#">rd.ext.core.msg-tweet-to-recip-target</a> runs after: rd.msg.tweet.raw,rd.msg.tweet-direct.raw. Creates 'rd.msg.recip-target' schemas for tweets</li>
      <li><a href="#">rd.ext.core.out-to-smtp</a> runs after: rd.msg.outgoing.simple. Creates outgoing smtp messages ready for delivery</li>
      <li><a href="#">rd.ext.core.rssfeed-to-rssitem</a> runs after: rd.raw.rss. Extracts a raw RSS/Atom feed into individual messages</li>
      <li><a href="#">rd.ext.core.sent-relationships</a> runs after: rd.msg.body. Emits identities and contacts for people we send things to</li>
      <li><a href="#">rd.ext.core.skypeid-to-rships</a> runs after: rd.identity.skype. Emits identities and relationships to a skype contact</li>
      <li><a href="#">rd.ext.core.twitterid-to-common</a> runs after: rd.identity.twitter. Emits identities and relationships for a twitter contact</li>
      <li><a href="#">rd.test.core.test_converter</a> runs after: rd.msg.test.raw. A test converter</li>
      </ul>
      
    </div>
    
  </div>
</div>


</body>
</html>