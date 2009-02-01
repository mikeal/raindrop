import ConfigParser, logging, os, os.path

__all__ = ['get_config']

class Config(object):
  COUCH_DEFAULTS = {'host': 'localhost', 'port': 5984, 'name': 'raindrop'}
  def __init__(self):
    self.parser = ConfigParser.SafeConfigParser()
    self.load()

    self.couches = {'local': self.COUCH_DEFAULTS.copy()}
    self.accounts = {}

    # configuration and logging.  two great flavors that go together.
    logging.basicConfig()


  def dictifySection(self, section_name, defaults=None, name=None):
    '''
    Given a config section name, suck up its contents into a dictionary.  Poor
    man's type detection turns lowercase true/false into the boolean of that
    type, things that can be int()ed into ints, and otherwise things get to
    stay strings.  Defaults are applied before dictification, and the name is
    an optional default for 'name' if specified (which overrides the defaults
    dict.)
    '''
    results = {}
    if defaults:
      results.update(defaults)
    if name:
      results['name'] = name
    for name, value in self.parser.items(section_name):
      if value.lower() in ('true', 'false'):
        value = (value.lower() == 'true')
      else:
        try:
          value = int(value)
        except:
          pass

      results[key] = value
    return results

  def load(self):
    self.parser.read([os.path.expanduser('~/.raindrop')])

    self.local_couch = self.parser.get('couches', 'local')
    self.remote_couch = self.parser.get('couches', 'remote')

    COUCH_PREFIX = 'couch-'
    ACCOUNT_PREFIX = 'account-'
    for section_name in self.parser.sections():
      if section_name.startswith(COUCH_PREFIX):
        couch_name = section_name[len(COUCH_NAME):]
        self.couches[couch_name] = self.dictifySection(section_name,
                                                       self.COUCH_DEFAULTS)

      if section_name.startswith(ACCOUNT_PREFIX):
        account_name = section_name[len(ACCOUNT_PREFIX):]
        self.accounts[account_name] = self.dictifySection(section_name, None,
                                                          account_name)

CONFIG = None
def get_config():
  global CONFIG
  if CONFIG is None:
    CONFIG = Config()
  return CONFIG
