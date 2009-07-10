from cStringIO import StringIO

from ..proc import base

from twisted.internet import protocol, defer
from twisted.mail import smtp
from twisted.python.failure import Failure
from twisted.internet.ssl import ClientContextFactory

from OpenSSL.SSL import SSLv3_METHOD

import logging
logger = logging.getLogger(__name__)

SMTPPostingClient_Base=smtp.ESMTPSender
class SMTPPostingClient(SMTPPostingClient_Base): #smtp.ESMTPClient):

    requireAuthentication = False
    requireTransportSecurity = False

    def __init__(self, acct, src_doc, out_doc, *args, **kw):
        self.acct = acct
        self.src_doc = src_doc
        self.out_doc = out_doc
        self.data_file = None # setup later.
        self.seen_from = False
        self.done_sent_state = False
        SMTPPostingClient_Base.__init__(self, *args, **kw)
        self.heloFallback = 1

    def connectionLost(self, reason=protocol.connectionDone):
        SMTPPostingClient_Base.connectionLost(self, reason)
        # should be impossible to get here without having updated sent state
        assert self.done_sent_state
        self.deferred.callback(None)

    #def smtpTransferFailed(self, code, resp):

    # We use the smtp 'state' functions to work with couch using deferreds -
    # all the 'normal' override points are expecting normal sync results...
    def smtpState_from(self, code, resp):
        # Here we record the fact we have attempted an SMTP send and
        # save the state back now - this should cause conflict errors if we
        # accidently have 2 processes trying to send the same message.
        # XXX - deterministic revision IDs may mean we need a UUID or
        # something too?
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
                SMTPPostingClient_Base.smtpState_from(self, code, resp)

        if self.seen_from:
            SMTPPostingClient_Base.smtpState_from(self, code, resp)
        else:
            d = do_couchy()
            d.addBoth(do_base)

    @defer.inlineCallbacks
    def _update_sent_state(self, code, resp):
        # check there isn't a path - particularly error handling - which calls
        # us twice.
        assert not self.done_sent_state, self.src_doc
        # been sent - record that.
        dm = self.acct.doc_model
        # ack - errors talking to couch here are too late to do anything
        # about...
        if code==250:
            _ = yield self.acct._update_sent_state(self.src_doc, 'sent')
        else:
            reason = (code, resp)
            message = resp # theoretically already suitable for humans.
            # for now, reset 'outgoing_state' back to 'outgoing' so the
            # next attempt retries.  We should differentiate between
            # 'permanent' errors and others though...
            _ = yield self.acct._update_sent_state(self.src_doc, 'error',
                                                   reason, message,
                                                   outgoing_state='outgoing')
        self.done_sent_state = True

    def smtpState_msgSent(self, code, resp):
        @defer.inlineCallbacks
        def do_couchy():
            _ = yield self._update_sent_state(code, resp)

        def do_base(result):
            SMTPPostingClient_Base.smtpState_msgSent(self, code, resp)
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

    def sendError(self, exc):
        # This will prevent our 'sent' handler about being called, so update
        # the state here.
        def do_base(result):
            SMTPPostingClient_Base.sendError(self, exc)

        d = self._update_sent_state(exc.code, exc.resp)
        d.addCallback(do_base)


class SMTPClientFactory(protocol.ClientFactory):
    protocol = SMTPPostingClient

    def __init__(self, account, conductor, src_doc, out_doc,
                 retries=5, timeout=None):
        # base-class has no __init__
        self.src_doc = src_doc
        self.out_doc = out_doc
        self.account = account
        self.conductor = conductor
        self.result = defer.Deferred() # client does errback on this
        def some_result(result):
            if isinstance(result, Failure):
                # XXX - by default this will create a log, which may include
                # a base64 encoded password.
                logger.info('smtp request FAILED: %s', result)
            else:
                logger.info('smtp mail succeeded')

        self.result.addBoth(some_result)
        # These are attributes twisted expects the factory to have.  But
        # we don't use their SMTPSenderFactory as it doesn't work that well
        # with our model of 'read attach and write state as late as possible'
        self.sendFinished = 0

        self.retries = -retries
        self.timeout = timeout

    def buildProtocol(self, addr):
        cf = ClientContextFactory()
        cf.method = SSLv3_METHOD
        p = self.protocol(self.account, self.src_doc, self.out_doc,
                          self.account.details.get("username", ""),
                          self.account.details.get("password", ""),
                          cf,
                          None, # identify???
                          logsize=30,
                          )
        p.deferred = self.deferred # ???????????
        p.factory = self
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
