from cStringIO import StringIO

from ..proc import base

from twisted.internet import protocol, defer
from twisted.mail import smtp
from twisted.python.failure import Failure

import logging
logger = logging.getLogger(__name__)

class SMTPPostingClient(smtp.ESMTPClient):
    def __init__(self, acct, src_doc, out_doc, *args, **kw):
        self.acct = acct
        self.src_doc = src_doc
        self.out_doc = out_doc
        self.data_file = None # setup later.
        self.seen_from = False
        smtp.ESMTPClient.__init__(self, *args, **kw)

    def connectionLost(self, reason=protocol.connectionDone):
        smtp.ESMTPClient.connectionLost(self, reason)
        self.deferred.callback(None)

    #def smtpTransferFailed(self, code, resp):

    # We use the smtp 'state' functions to work with couch using deferreds -
    # all the 'normal' override points are expecting normal sync results...
    def smtpState_from(self, code, resp):
        # Here we record the fact we have attempted an SMTP send and
        # save the state back now - this should cause conflict errors if we
        # accidently have 2 processes trying to send the same message.
        @defer.inlineCallbacks
        def do_couchy():
            dm = self.acct.doc_model
            try:
                _ = yield self.acct._update_sent_state(self.src_doc, 'sending')
                # And now is also a good (enough) time to do a 'deferred' open
                # of the attachment.
                attach = yield dm.db.openDoc(dm.quote_id(self.out_doc['_id']),
                                             attachment='smtp_body')
                self.data_file = StringIO(attach)
            except:
                logger.exception("Failed to talk to couch")
                self._disconnectFromServer()

        def do_base(result):
            if isinstance(result, Failure):
                logger.error("Failed to update couch state: %s", result)
                self._disconnectFromServer()
            else:
                smtp.ESMTPClient.smtpState_from(self, code, resp)

        if self.seen_from:
            smtp.ESMTPClient.smtpState_from(self, code, resp)
        else:
            d = do_couchy()
            d.addBoth(do_base)

    def smtpState_msgSent(self, code, resp):
        @defer.inlineCallbacks
        def do_couchy():
            # been sent - record that.
            dm = self.acct.doc_model
            # ack - errors talking to couch here are too late to do anything
            # about...
            if code==250:
                _ = yield self.acct._update_sent_state(self.src_doc, 'sent')
            else:
                reason = (code, resp) # is this enough?
                _ = yield self.acct._update_sent_state(self.src_doc, 'error', reason)

        def do_base(result):
            smtp.ESMTPClient.smtpState_msgSent(self, code, resp)
        d = do_couchy()
        d.addBoth(do_base)

    def getMailFrom(self):
        if self.seen_from:
            # This appears the official way to finish...
            return None
        self.seen_from = True
        return self.out_doc['smtp_from']

    def getMailTo(self):
        return self.out_doc['smtp_to']

    def getMailData(self):
        return self.data_file

    def sentMail(self, code, resp, numOk, addresses, log):
        # Woohoo - some response from the server - hopefully a good one.
        logger.debug('sentMail with %d (%s)', code, resp)
 
class SMTPClientFactory(protocol.ClientFactory):
    protocol = SMTPPostingClient
    def __init__(self, account, conductor, src_doc, out_doc):
        # base-class has no __init__
        self.src_doc = src_doc
        self.out_doc = out_doc
        self.account = account
        self.conductor = conductor

    def buildProtocol(self, addr):
        p = self.protocol(self.account, self.src_doc, self.out_doc,
                          secret=None, identity='')
        p.deferred = self.deferred # ???????????
        return p

    def connect(self):
        details = self.account.details
        logger.debug('attempting to connect to %s:%d (ssl: %s)',
                     details['host'], details['port'], details['ssl'])
        reactor = self.conductor.reactor
        self.deferred = defer.Deferred()
        reactor.connectTCP(details['host'], details['port'], self)
        return self.deferred


class SMTPAccount(base.AccountBase):
    rd_outgoing_schemas = ['rd.msg.outgoing.smtp']
    @defer.inlineCallbacks
    def startSend(self, conductor, src_doc, dest_doc):
        # do it...
        factory = SMTPClientFactory(self, conductor, src_doc, dest_doc)
        client = yield factory.connect()
        # apparently all done!
