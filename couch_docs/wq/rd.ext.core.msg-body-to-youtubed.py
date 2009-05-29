import re
import urllib2
import xml.parsers.expat

# Creates 'rd.msg.body.youtubed' schemas for emails...
def handler(doc):
    body = doc['body']
    matches = re.findall("http\:\/\/www.youtube.com\/watch\?v=(\w+)", body)
    if len(matches) > 0:
        for videoId in matches:
            logger.info("found the youtube vidoe http://www.youtube.com/watch?v=%s ", videoId)
            youTubeDataURL = "http://gdata.youtube.com/feeds/api/videos/%s" % videoId
            try:
                opener = urllib2.build_opener()
                youTubeDataXML = opener.open(youTubeDataURL).read()
                opener.close()
            except HTTPError, exc:
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
        self.ret[name] = attrs

    def end_element(self, name):
        if self._buff != "":
            self.ret[name]["body"] = self._buff
            self._buff = ""

    def char_data(self, data):
        self._buff += data

