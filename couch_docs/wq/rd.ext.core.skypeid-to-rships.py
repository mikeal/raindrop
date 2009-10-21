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

# An 'identity spawner' skype/raw as input and creates a number of identities.
# Uses a different 'emit_*' function which does some higher-level contacts
# work with the result schemas.
def handler(doc):
    def _gen_em(props):
        # the primary 'skype' one first...
        yield ('skype', props['skype_handle']), None
        v = props.get('skype_homepage')
        if v:
            yield ('url', v.rstrip('/')), 'homepage'
        # NOTE: These 'phone' identities are only marginally useful now as
        # although skype seems to help convert it to the +... format, it
        # doesn't normalize the rest of it.
        # may want to normalize to something like "remove everything not a
        # number except the leading + and an embedded 'x' for extension".
        # Optionally, if we wind up storing an unnormalized one for display
        # purposes just nuke all non-numbers.
        v = props.get('skype_phone_home')
        if v:
            yield ('phone', v), 'home'
        v = props.get('skype_phone_mobile')
        if v:
            yield ('phone', v), 'mobile'
        v = props.get('skype_phone_office')
        if v:
            yield ('phone', v), 'office'
        # skype-out contacts seem a little strange - they don't have
        # any phone numbers - but their ID is the phone-number!  Skype
        # displays the number as a 'home' number...
        if props.get('skype_onlinestatus')=='SKYPEOUT':
            yield ('phone', props['skype_handle']), 'home'

    def_contact_props = {
        'name': doc['skype_displayname'] or doc['skype_fullname'],
    }
    emit_related_identities(_gen_em(doc), def_contact_props)
