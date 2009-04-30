# This is an extension which converts a message/raw/rfc822 to a
# message/raw/rfc822
from __future__ import absolute_import # stop 'email' import finding our ext

import logging
from twisted.internet import defer

from ...proc import base
from ...model import encode_provider_id
import pprint

logger = logging.getLogger(__name__)


class ConversationConverter(base.SimpleConverterBase):
  target_type = 'msg', 'message/email-in-conversation'
  sources = [('msg', 'raw/message/rfc822')]
  ghosts_created = {}
  
  def simple_convert(self, doc):
    # get the document we care about, not the one in this simple chain
    cat, prov_id, doc_type = doc['_id'].split('!')
    startkey = 'msg!' + prov_id
    endkey = 'msg!' + prov_id + 'A' # XXX not sure that's ideal
    # we need both the rfc822 version for the headers, and the message/email
    # version for the timestamp
    return self.doc_model.open_view('raindrop!messages!by',
                                    'by_id', startkey=startkey, endkey=endkey,
                                    include_docs=True
      ).addCallback(self.finish_convert, doc)


  def finish_convert(self, result, origdoc):
    doc = {}
    for row in result['rows']:
      # we want two kinds of documents, munged together
      # XXX possibly lossy?
      if row['value'] in ('raw/message/email', 'raw/message/rfc822'):
        doc.update(row['doc'])
    headers = doc['headers']
    self_header_message_id = headers['message-id']

    if 'references' in headers:
      header_message_ids = headers['references']
    elif 'in-reply-to' in headers:
      header_message_ids = [headers['in-reply-to']]
    else:
      header_message_ids = []
    # save off the list of referenced messages
    references = header_message_ids[:]
    # see if the self-message already exists...
    if self_header_message_id:
      header_message_ids.append(self_header_message_id)
    else:
      raise ValueError, "empty message id!"
    logger.debug("header_message_id: %s ", header_message_ids)
    logger.debug("references: %s", '\n\t'.join(references))
    return defer.DeferredList([self.doc_model.open_view('raindrop!messages!by',
                                    'by_header_message_id',
                                    include_docs=True,
                                    key=hid) for hid in header_message_ids]
      ).addCallback(self._gotMessageIds, references, header_message_ids, doc)

  def _gotMessageIds(self, results, references, header_message_ids, doc):
    conversation_id = None
    conversations = {}
    self_message = None
    unseen = set(header_message_ids)
    headers = doc['headers']
    self_header_message_id = doc['headers']['message-id']
    # remove ourselves from the unseen list
    unseen.remove(self_header_message_id)
    timestamp = doc['timestamp']
    logger.debug("headers['from']: %s", headers['from'])
    logger.debug("headers['subject']: %s", headers['subject'])

    for row in results[0][1]['rows']:
      hid = row['key']
      if (hid in unseen):
        unseen.remove(hid)
      if row['doc']['type'] == 'message/email-in-conversation' and \
           'ghost' not in row['doc']:
        conversation_id = row['doc']['conversation_id']

    if conversation_id is None:
      # we need to allocate a conversation_id...
      logger.debug("CREATING conversation_id %s", header_message_ids[0])
      conversation_id = header_message_ids[0]
    else:
      logger.debug("FOUND CONVERSATION header_message_id %s in row['key'] %s with conversation_id %s", self_header_message_id, row['key'], conversation_id)

    # create dudes who are missing
    if unseen:
      missing_messages = []
      ndocs = []

      for header_message_id in unseen:
        if header_message_id in self.ghosts_created:
          # we've already created this particular ghost
          continue
        self.ghosts_created[header_message_id] = True
        ndoc = {'conversation_id': conversation_id,
                'timestamp': timestamp,
                'header_message_id': header_message_id}
        self.doc_model.prepare_ext_document('msg', 'ghost',
                                            encode_provider_id(header_message_id),
                                            ndoc)
        logger.debug("Creating ghost for header_message_id: %s with id %s ", header_message_id, ndoc['_id'])
        ndocs.append(ndoc)

      return self.doc_model.create_ext_documents(ndocs
        ).addCallback(self._cb_saved_ghosts, doc, conversation_id, self_message, references, timestamp)

  def _cb_saved_ghosts(self, result, doc, conversation_id, self_message, references, timestamp):
    ret = {'conversation_id': conversation_id,
           'timestamp': timestamp,
           'header_message_id': doc['headers']['message-id'],
           'references': references
    }
    return ret


