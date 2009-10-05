import re
import urllib2
import xml.parsers.expat

yt_re = re.compile("http\:\/\/www.youtube.com\/watch\?v=(\w+)")

# Creates 'rd.msg.body.youtubed' schemas for emails...
def handler(doc):
    #Skip docs that do not have a links property.
    if not 'links' in doc:
        return

    links = doc['links']
    for link in links:
        match = yt_re.search(link)
        if match:
            videoId = match.group(1)

            logger.debug("found the youtube video http://www.youtube.com/watch?v=%s ", videoId)
            youTubeDataURL = "http://gdata.youtube.com/feeds/api/videos/%s" % videoId
            try:
                opener = urllib2.build_opener()
                youTubeDataXML = opener.open(youTubeDataURL).read()
                opener.close()
            except urllib2.HTTPError, exc:
                if exc.code == 404:
                    logger.info("can't find the you tube video http://www.youtube.com/watch?v=%s",
                                  videoId)
                    return
                else:
                    logger.warn("things went really bad when looking for %s",
                                youTubeDataURL)
                    raise

            ytp = YouTubeParser(youTubeDataXML)
            ytp.parse()
            ret = ytp.get_return()
            ret["video_id"] = videoId
            emit_schema('rd.msg.body.youtubed', ret)


class YouTubeParser:
    p = ""
    ret = {}
    _buff = ""

    def __init__(self, xml_string):
        self.xml_string = xml_string
        self.p = xml.parsers.expat.ParserCreate()
        self.p.StartElementHandler = self.start_element
        self.p.EndElementHandler = self.end_element
        self.p.CharacterDataHandler = self.char_data

    def parse(self):
        self.p.Parse(self.xml_string)

    def get_return(self):
        return self.ret

    def start_element(self, name, attrs):
        if self.ret.has_key(name):
            if type(self.ret[name]) == list:
                self.ret[name].append(attrs)
            else:
                self.ret[name] = [self.ret[name], attrs]
        else:
            self.ret[name] = attrs

    def end_element(self, name):
        if self._buff != "":
            self.ret[name]["body"] = self._buff
            self._buff = ""

    def char_data(self, data):
        self._buff += data
