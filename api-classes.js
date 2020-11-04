const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /**
   * This method is designed to be called to generate a new StoryList.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.*
   */

  // TODO: Note the presence of `static` keyword: this indicates that getStories
  // is **not** an instance method. Rather, it is a method that is called on the
  // class directly. Why doesn't it make sense for getStories to be an instance method?

  static async getStories() {
    // query the /stories endpoint (no auth required)
    const response = await axios.get(`${BASE_URL}/stories`);

    // turn the plain old story objects from the API into instances of the Story class
    const stories = response.data.stories.map((story) => new Story(story));

    // build an instance of our own class using the new array of stories
    const storyList = new StoryList(stories);
    return storyList;
  }

  /**
   * Method to make a POST request to /stories and add the new story to the list
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   *
   * Returns the new story object
   */

  static async addStory(user, newStory) {
    // TODO - Implement this functions!
    // this function should return the newly created story so it can be used in
    // the script.js file where it will be appended to the DOM

    //post the infomation
    const response = await axios.post(`${BASE_URL}/stories`, {
      token: user.loginToken,
      story: newStory,
    });

    //get the created new story
    const story = new Story(response.data.story);

    return story;
  }

  /**
   * Method to make a POST request to /users/username/favorites/storyId and add the story to favorite
   * @param {User} the current instance of User who is login
   * @param {String} storyId the story to add to the favorite
   */
  static async addFavorite(user, storyId) {
    //post the infomation
    const response = await axios.post(
      `${BASE_URL}/users/${user.username}/favorites/${storyId}`,
      {
        token: user.loginToken,
      }
    );

    if (response.status === 200) {
      return true;
    }
    return false;
  }

  /**
   * Method to make a DELETE request to /users/username/favorites/storyId and delete the story from favorite
   * @param {User} the current instance of User who is login
   * @param {String} storyId the story to remove from the favorite
   */
  static async removeFavorite(user, storyId) {
    //post the infomation
    const response = await axios.delete(
      `${BASE_URL}/users/${user.username}/favorites/${storyId}`,
      {
        data: { token: user.loginToken },
      }
    );

    if (response.status === 200) {
      return true;
    }
    return false;
  }

  /**
   * Method to make a DELETE request to /stories/storyId and delete the story
   * @param {User} the current instance of User who is login
   * @param {String} storyId the story to delete
   */
  static async removeStory(user, storyId) {
    //post the infomation
    const response = await axios.delete(`${BASE_URL}/stories/${storyId}`, {
      data: { token: user.loginToken },
    });

    if (response.status === 200) {
      return true;
    }
    return false;
  }

  /**
   * Methord to get a story from a story array
   * @param {Array of Story} storyList
   * @param {String} storyId
   */
  static getFromArray(storyList, storyId) {
    const index = StoryList.getIndex(storyList, storyId);

    if (index !== -1) {
      return storyList[index];
    }
    return null;
  }
  /**
   * Methord to remove a story from a story array
   * @param {Array of Story} storyList
   * @param {String} storyId
   */
  static removeFromArray(storyList, storyId) {
    const index = StoryList.getIndex(storyList, storyId);

    if (index !== -1) {
      storyList.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Methord to check a story if it is in a story array
   * @param {Array of Story} storyList
   * @param {String} storyId
   */
  static getIndex(storyList, storyId) {
    for (let i = 0; i < storyList.length; i++) {
      if (storyList[i].storyId === storyId) {
        return i;
      }
    }
    return -1;
  }
}

/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;

    // these are all set to defaults, not passed in by the constructor
    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }

  /* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async create(username, password, name) {
    const response = await axios.post(`${BASE_URL}/signup`, {
      user: {
        username,
        password,
        name,
      },
    });

    // build a new User instance from the API response
    const newUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    newUser.loginToken = response.data.token;

    return newUser;
  }

  /* Update and return a new user.
   *
   * Makes POST request to API and returns updated user.
   * - token : current login token
   * - username: a new username
   * - name: the user's full name
   */

  static async update(token, username, name) {
    const response = await axios.patch(`${BASE_URL}/users/${username}`, {
      token,
      user: {
        name,
      },
    });

    // build a new User instance from the API response
    const user = new User(response.data.user);

    return user;
  }

  /* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
      const response = await axios.post(`${BASE_URL}/login`, {
        user: {
          username,
          password,
        },
      });

      // build a new User instance from the API response
      const existingUser = new User(response.data.user);

      // instantiate Story instances for the user's favorites and ownStories
      existingUser.favorites = response.data.user.favorites.map(
        (s) => new Story(s)
      );
      existingUser.ownStories = response.data.user.stories.map(
        (s) => new Story(s)
      );

      // attach the token to the newUser instance for convenience
      existingUser.loginToken = response.data.token;

      return existingUser;
  }

  /** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;

    // call the API
    const response = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {
        token,
      },
    });

    // instantiate the user from the API information
    const existingUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = token;

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(
      (s) => new Story(s)
    );
    existingUser.ownStories = response.data.user.stories.map(
      (s) => new Story(s)
    );
    return existingUser;
  }
}

/**
 * Class to represent a single story.
 */

class Story {
  /**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }
}
