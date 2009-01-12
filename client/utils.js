function makeTimestampFriendly(timestamp) {
  return makeDateFriendly(new Date(timestamp * 1000));
}

function makeDateFriendly(date) {
  return date.toString();
}

function makeFriendlyName(name)
{
  var firstName = name.split(' ')[0];
  if (firstName.indexOf('@') != -1)
      firstName = firstName.split('@')[0];
  firstName = firstName.replace(" ", "");
  firstName = firstName.replace("'", "");
  firstName = firstName.replace('"', "");
  return firstName;
}