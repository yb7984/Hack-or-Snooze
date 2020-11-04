$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $editAccountForm = $("#edit-account-form");
  const $favoriteStoriesList = $("#favorited-articles");
  const $filteredArticles = $("#filtered-articles");
  const $ownStories = $("#my-articles");
  const $userProfile = $("#user-profile");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    try {
      // call the login static method to build a user instance
      const userInstance = await User.login(username, password);

      // set the global user to the user instance
      currentUser = userInstance;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    } catch (err) {
      if (err.indexOf("404") !== -1) {
        alert(`Account ${username} does not exist. Please try again!`);
      } else if (err.message.indexOf("401") !== -1) {
        alert("username and password didn't match. Please try again!");
      } else {
        alert("Login Failed!Please try again!");
      }
    }
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    try {
      // call the create method, which calls the API and then builds a new user instance
      const newUser = await User.create(username, password, name);

      currentUser = newUser;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    } catch (err) {
      console.log(err.message);
      if (err.indexOf("409") !== -1) {
        //conflict
        alert(`username ${username}" already exists. Please try another one!`);
      } else {
        alert(`Failure to create the account. Please try again!`);
      }
    }
  });

  /**
   * Event listener for edit user profile.
   *  If successfully we will setup a updated user instance
   */

  $editAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#edit-account-name").val();

    try {
      // call the update method, which calls the API and then builds a new user instance
      const user = await User.update(
        currentUser.loginToken,
        currentUser.username,
        name
      );
      //successfully updated
      currentUser = user;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    } catch (err) {
      //fail to update
      alert("Updating profile Failed!Please try again!");
    }
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event listener for Create Story.
   *  If successfully we will show the new story in the list
   */

  $submitForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the story information
    const author = $("#author").val();
    const title = $("#title").val();
    const url = $("#url").val();

    //add the story
    const story = await StoryList.addStory(
      currentUser,
      new Story({ author, title, url })
    );

    //append the new story
    const result = generateStoryHTML(story);
    $allStoriesList.prepend(result);

    //append to the storyList
    storyList.stories.splice(0 , 0 , story);

    //append to the currentUser
    currentUser.ownStories.push(story);

    submitForm();
  });

  /**
   * Event listener for adding and removing to favorite
   * If successfully we will show the star as solid or just border
   */
  $(".articles-container").on("click", ".star", async function (evt) {
    evt.preventDefault(); // no page-refresh

    const $favorIcon = $(evt.target);
    const $li = $favorIcon.parents("li");
    const storyId = $li.attr("id");

    if ($favorIcon.hasClass("fas")) {
      //already in the favorite , remove
      const isSuccess = await StoryList.removeFavorite(currentUser, storyId);

      if (isSuccess) {
        //remove the favorite from currentUser
        StoryList.removeFromArray(currentUser.favorites, storyId);

        if ($li.parents("#favorited-articles").length > 0) {
          //if showing the favorite list, remove it
          $li.remove();
        } else {
          //change the star icon style
          $favorIcon.removeClass("fas").addClass("far");
        }
      }
    } else {
      //add to the favorite
      const isSuccess = await StoryList.addFavorite(currentUser, storyId);

      if (isSuccess) {
        //add the story information to currentUser favorites
        const story = StoryList.getFromArray(storyList.stories, storyId);

        currentUser.favorites.push(story);
        //change the star icon style
        $favorIcon.removeClass("far").addClass("fas");
      }
    }
  });

  /**
   * Event listenser to remove story
   * If successfully we will remove it from the list
   */
  $(".articles-container").on("click", ".trash-can", async function (evt) {
    evt.preventDefault(); // no page-refresh

    const $removeIcon = $(evt.target);
    const $li = $removeIcon.parents("li");
    const storyId = $li.attr("id");

    const isSuccess = await StoryList.removeStory(currentUser, storyId);

    if (isSuccess) {
      //successful delete, remove the story from the list
      $li.remove();

      //remove from currentUser
      StoryList.removeFromArray(currentUser.ownStories, storyId);
      StoryList.removeFromArray(currentUser.favorites, storyId);
    }
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * Event handler for Navigation to Create Story
   */

  $("body").on("click", "#nav-create", async function () {
    hideElements();

    $submitForm.show();

    await generateStories();
    $allStoriesList.show();
  });

  /**
   * Event handler for Navigation to Favorite stories
   */

  $("body").on("click", "#nav-favorite", async function () {
    hideElements();

    generateStories("favorite");

    $favoriteStoriesList.show();
  });

  /**
   * Event handler for Navigation to Own stories
   */

  $("body").on("click", "#nav-own", async function () {
    hideElements();

    generateStories("own");

    $ownStories.show();
  });

  /**
   * Event handler for Navigation to Own stories
   */

  $("body").on("click", "#nav-user-profile", async function () {
    hideElements();

    $userProfile.show();

    $("#edit-account-name").val(currentUser.name);
    $("#profile-account-date-text").text(currentUser.createdAt);
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);

    hideElements();

    $allStoriesList.show();

    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    //refresh the list
    generateStories();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to run to reset the forms and hide the create story info
   */
  function submitForm() {
    //hide the form
    $submitForm.hide();

    //reset the form
    $submitForm.trigger("reset");

    //show the stories
    $allStoriesList.show();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories(listType = "all") {
    let stories = null;
    let $storyContainer = null;

    if (listType === "favorite") {
      //get the list from currentUser
      stories = currentUser.favorites;
      $storyContainer = $favoriteStoriesList;
    } else if (listType === "own") {
      //get the list from currentUser
      stories = currentUser.ownStories;
      $storyContainer = $ownStories;
    } else {
      //get data from the server only when storyList is null
      if (storyList === null) {
        // get an instance of StoryList
        const storyListInstance = await StoryList.getStories();
        // update our global variable
        storyList = storyListInstance;
      }

      stories = storyList.stories;
      $storyContainer = $allStoriesList;
    }
    // empty out that part of the page
    $storyContainer.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of stories) {
      const result = generateStoryHTML(story);
      $storyContainer.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <i class="${
          currentUser &&
          StoryList.getIndex(currentUser.favorites, story.storyId) !== -1
            ? "fas"
            : "far"
        } fa-star star ${currentUser ? "" : "hidden"}"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <i class="fas fa-trash-alt trash-can ${
          currentUser && story.username === currentUser.username ? "" : "hidden"
        }"></i>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $favoriteStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
    ];
    elementsArr.forEach(($elem) => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navWelcome.show();

    $navUserProfile.html(currentUser.name);

    $("#nav-create").show();
    $("#nav-favorite").show();
    $("#nav-own").show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
