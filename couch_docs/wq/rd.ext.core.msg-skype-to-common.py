# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Raindrop.
#
# The Initial Developer of the Original Code is
# Mozilla Messaging, Inc..
# Portions created by the Initial Developer are Copyright (C) 2009
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#

# A 'converter' - takes a rd.msg.skypemsg.raw as input and creates various
# schema outputs for that message - specifically 'body' and 'conversation'
def handler(doc):
    subject = doc['skype_chat_friendlyname']
    # Currently 'body' also defines 'envelope' type items
    bdoc = {'from': ['skype', doc['skype_from_handle']],
            'from_display': doc['skype_from_dispname'],
            'subject': subject,
            'body': doc['skype_body'],
            'body_preview': doc['skype_body'][:140],
            'timestamp': doc['skype_timestamp'], # skype's works ok here?
            }
    emit_schema('rd.msg.body', bdoc)
    # and a conversation schema
    cdoc = {'conversation_id': doc['skype_chatname']}
    emit_schema('rd.msg.conversation', cdoc)
