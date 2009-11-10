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

import Skype4Py
import os
import tempfile
from raindrop.proto.skype import simple_convert


skype = None

# These are the raw properties we fetch from skype.
USER_PROPS = [
    # extras include 'handle' and 'IsSkypeOutContact'
    ('ABOUT', unicode),
    ('ALIASES', list),
    ('BIRTHDAY', unicode),
    ('CITY', unicode),
    ('COUNTRY', unicode),
    ('DISPLAYNAME', unicode),
    ('FULLNAME', unicode),
    ('HASCALLEQUIPMENT', bool),
    ('HOMEPAGE', unicode),
    ('ISAUTHORIZED', bool),
    ('ISBLOCKED', bool),
    ('IS_VIDEO_CAPABLE', bool),
    ('IS_VOICEMAIL_CAPABLE', bool),
    ('LANGUAGE', unicode),
    ('MOOD_TEXT', unicode),
    ('ONLINESTATUS', unicode),
    ('PHONE_HOME', unicode),
    ('PHONE_MOBILE', unicode),
    ('PHONE_OFFICE', unicode),
    ('PROVINCE', unicode),
    ('RICH_MOOD_TEXT', unicode),
    ('SEX', unicode),
    ('SPEEDDIAL', unicode),
    ('TIMEZONE', int),
]

def handler(doc):
    typ, (id_type, iid) = doc['rd_key']
    assert typ=='identity' # Must be an 'identity' to have this schema type!
    if id_type != 'skype':
        # Not a skype ID.
        return
    # Is a skype ID - attach to skype and process it.
    global skype
    if skype is None:
        skype = Skype4Py.Skype()
        skype.Attach()

    user = skype.User(iid)
    props = {'skype_handle': user._Handle}
    for name, typ in USER_PROPS:
        val = user._Property(name)
        props['skype_'+name.lower()] = simple_convert(val, typ)

    # Avatars...
    # for now just attempt to get one avatar for this user...
    avfname = tempfile.mktemp(".jpg", "raindrop-skype-avatar")
    try:
        try:
            user.SaveAvatarToFile(avfname)
            # apparently the avatar was saved...
            f = open(avfname, "rb")
            try:
                data = f.read()
            finally:
                f.close()
        finally:
            # apparently skype still creates a 0-byte file when there
            # are no avatars...
            if os.path.exists(avfname):
                try:
                    os.unlink(avfname)
                except os.error, why:
                    logger.warning('failed to remove avatar file %r: %s',
                                   avfname, why)
        logger.debug("got an avatar for %r", iid)
        # the literal '1' reflects the 1-based indexing of skype..
        attachments = {'avatar1' :
                            {'content_type': 'image/jpeg',
                             'data': data,
                            }
                       }
        has_avatar = True
    except Skype4Py.errors.ISkypeError, why:
        has_avatar = False
        # apparently:
        # invalid 'avatar' index: [Errno 114] GET Invalid avatar
        # no avatar at all: [Errno 122] GET Unable to load avatar
        if why[0] in (114, 122):
            logger.debug("friend %r has no avatar (%s)", iid, why)
        else:
            logger.warning("Cannot save avatar for skype user %s", iid)
        attachments = None

    did = emit_schema('rd.identity.skype', props, attachments=attachments)

    # emit one for the normalized identity schema
    props = {
            'name' : user.DisplayName or user.FullName,
            'nickname' : user._Handle
    }
    user_homepage = user.Homepage
    if user_homepage:
        props['url'] = user_homepage

    if has_avatar:
        props['image'] = '/%s/avatar1' % did
    emit_schema('rd.identity', props)
