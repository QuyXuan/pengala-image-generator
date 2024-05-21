import {
  fetchImageURL,
  fetchImageFromExplore,
  fetchImageFromCreate,
  fetchImageFromMyCreation,
  checkUserExist,
  deleteListImages,
} from "./firebase.js";

$(document).ready(function () {
  FunctionModule.Init();
  FunctionModule.InitEvents();
});

const FunctionModule = (function () {
  let takeExplore = 10;
  let takeMyCreation = 10;
  let loadingExplore = false;
  let loadingMyCreation = false;
  let lastCreateTimeExplore = null;
  let lastCreateTimeMyCreation = null;
  let columnCount = 5;
  let currentColumn = 1;
  const userEmail = $.cookie("user_email");

  const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  const Init = function () {
    try {
      if (window.location.pathname === "/") {
        fetchExploreImagesInfiniteScroll();
      } else if (window.location.pathname === "/create/generate") {
        checkUser().then((exist) => {
          if (exist) {
            $("#text-prompt").focus();
            fetchCreateImagesInfiniteScroll();
          }
        });
      } else if (window.location.pathname === "/creation") {
        checkUser().then((exist) => {
          if (exist) {
            fetchMyCreationImagesInfiniteScroll();
          }
        });
      }
    } catch (e) {
      console.log("Init: " + e.message);
    }
  };

  const InitEvents = function () {
    try {
      $(".explore").scroll(function () {
        if (
          $(this).scrollTop() + $(this).height() >=
            $(this)[0].scrollHeight - 100 &&
          !loadingExplore
        ) {
          fetchExploreImagesInfiniteScroll();
        }
      });

      $(".creation").scroll(function () {
        if (
          $(this).scrollTop() + $(this).height() >=
            $(this)[0].scrollHeight - 100 &&
          !loadingMyCreation
        ) {
          fetchMyCreationImagesInfiniteScroll();
        }
      });

      $("#checkbox-switch-mode").on("click", function () {
        toggleSwitchMode(this);
      });

      $("#float-btn").on("click", function () {
        toggleListImage();
      });

      $(".option").on("click", function () {
        selectOption(this);
      });

      $("#text-prompt").on("input", function () {
        validateTextPrompt(this);
      });

      $(".btn-gradient-transition").on("click", function () {
        generateImage();
      });

      $("#inputImage").on("change", function () {
        importImage(this);
      });

      $(".image-generated").on("click", function () {
        showImage(this);
      });

      $("#btn-download-image").on("click", function () {
        downloadImage($("#img-center").attr("src"));
      });

      $(".user-avatar").on("click", function () {
        toggleUserAvatar();
      });

      $("#login-dialog").on("click", function (event) {
        if (event.target.id === "login-dialog") {
          $("#login-dialog").hide();
        }
      });

      $("#close-login-dialog").on("click", function () {
        $("#login-dialog").hide();
      });

      $(".login-btn").on("click", function () {
        $("#login-dialog").show();
      });

      $(".btn-login-google").on("click", function () {
        openPopupLoginWithGoogle();
      });

      $(".btn-logout").on("click", function () {
        logout();
      });

      $("#image-dialog-container").on("click", function (event) {
        if (event.target.id === "image-dialog-container") {
          $("#image-dialog-container").addClass("hidden");
          $("#image-dialog-container").removeClass("flex");
        }
      });

      $("#close-image-dialog").on("click", function () {
        $("#raw-image-dialog-right").hide();
        $("#image-dialog-container").addClass("hidden");
        $("#image-dialog-container").removeClass("flex");
      });

      $("#raw-image-dialog-right")
        .on("mousedown", function () {
          $("#raw-image-dialog-left").show();
          $("#transferred-image-dialog").hide();
        })
        .on("mouseup", function () {
          $("#raw-image-dialog-left").hide();
          $("#transferred-image-dialog").show();
        });

      $("#btn-download-dialog").on("click", function () {
        downloadImage(
          $("#transferred-image-dialog").children("img").attr("src")
        );
      });

      $("#copy-text-prompt-dialog").on("click", function () {
        const textPrompt = $("#text-prompt-dialog");
        navigator.clipboard.writeText(textPrompt.text());
        showSuccess("Text copied to clipboard");
      });

      $("#btn-select-images").on("click", function () {
        toggleSelectImages(this);
      });

      $("#btn-close-modal-selected-images").on("click", function () {
        toggleSelectImages($("#btn-select-images"));
      });

      $("#btn-download-list-imgs").on("click", function () {
        downloadListImages();
      });

      $("#btn-delete-list-imgs").on("click", function () {
        deleteImages();
      });
    } catch (e) {
      console.log("InitEvents: " + e.message);
    }
  };

  const toggleSwitchMode = function (element) {
    if ($(element).is(":checked")) {
      $("#image-container").show();
      $("#image-dimensions-container").hide();
    } else {
      $("#image-container").hide();
      $("#image-dimensions-container").show();
    }
  };

  const toggleListImage = function () {
    const arrow = $("#arrow");
    const imageListContainer = $("#list-img-container");
    const imgCenter = $("#img-center");
    if (imageListContainer.hasClass("lg:w-80")) {
      imageListContainer.removeClass("lg:w-80");
      imageListContainer.addClass("w-0");
      imageListContainer.removeClass("px-5");
      arrow.addClass("rotate-180");
      imgCenter.removeAttr("class");
      imgCenter.addClass("scale-[120%]");
    } else {
      imageListContainer.removeClass("w-0");
      imageListContainer.addClass("lg:w-80");
      imageListContainer.addClass("px-5");
      arrow.removeClass("rotate-180");
      imgCenter.removeAttr("class");
      imgCenter.addClass("scale-125 transition-all duration-500");
    }
  };

  const selectOption = function (element) {
    $(".option").removeClass("bg-[#3B3947]");
    $(element).addClass("bg-[#3B3947]");
  };

  const validateTextPrompt = function (element) {
    const btnGenerate = $(".btn-gradient-transition");
    if ($(element).val().length !== 0) {
      btnGenerate.removeAttr("disabled");
    } else {
      btnGenerate.attr("disabled", "disabled");
    }
  };

  const generateImage = function () {
    checkUser().then((exist) => {
      if (!exist) {
        showWarning("Please login to generate image");
        return;
      } else {
        const loadingOverlay = $("#loading-overlay");
        const textPrompt = $("#text-prompt");
        let height,
          width = 0;
        $(".option").each(function () {
          if ($(this).hasClass("bg-[#3B3947]")) {
            const size = $(this).children("div").first().text().split("x");
            height = parseInt(size[0], 10);
            width = parseInt(size[1], 10);
          }
        });

        loadingOverlay.addClass("load");
        if ($("#checkbox-switch-mode").is(":checked")) {
          $.ajax({
            type: "POST",
            url: "/image-to-image",
            data: {
              text_prompt: textPrompt.val(),
            },
            success: function (response) {
              textPrompt.val("");
              $(".btn-gradient-transition").attr("disabled", "disabled");
              if (response.error) {
                showError(response.error);
                return;
              }
              const imageCenter = $("#img-center");
              getMetaImage(response.image_url, function (width, height) {
                imageCenter.css({
                  "aspect-ratio": width / height,
                });
              });
              imageCenter.attr("src", response.image_url);
              addImageHTML(response.image_url);
              $("#btn-download-image").show();
              loadingOverlay.removeClass("load");
              showSuccess("Image generated successfully");
            },
            error: function (error) {
              loadingOverlay.removeClass("load");
              textPrompt.val("");
              $(".btn-gradient-transition").attr("disabled", "disabled");
              showError("Error generating image");
              console.log(error);
            },
          });
        } else {
          $.ajax({
            type: "POST",
            url: "/text-to-image",
            data: {
              text_prompt: textPrompt.val(),
              height: height,
              width: width,
            },
            success: function (response) {
              textPrompt.val("");
              $(".btn-gradient-transition").attr("disabled", "disabled");
              if (response.error) {
                showError(response.error);
                return;
              }
              const imageCenter = $("#img-center");
              getMetaImage(response.image_url, function (width, height) {
                imageCenter.css({
                  "aspect-ratio": width / height,
                });
              });
              imageCenter.attr("src", response.image_url);
              addImageHTML(response.image_url);
              $("#btn-download-image").show();
              loadingOverlay.removeClass("load");
              showSuccess("Image generated successfully");
            },
            error: function (error) {
              loadingOverlay.removeClass("load");
              textPrompt.val("");
              $(".btn-gradient-transition").attr("disabled", "disabled");
              showError("Error generating image");
              console.log(error);
            },
          });
        }
      }
    });
  };

  const addImageHTML = function (src) {
    getMetaImage(src, function (width, height) {
      const listImages = $("#list-images");
      const newDiv = $("<div></div>");
      newDiv.addClass(
        "image-generated w-[136px] h-48 opacity-50 hover:opacity-100 image-placeholder-animation rounded-md overflow-hidden"
      );
      newDiv.html(
        `<div class="h-full w-full flex justify-center items-center">
          <div
            class="flex w-full h-full relative rounded-[6px] shadow-md justify-center"
          >
            <img
              class="transition-all duration-500 object-fill cursor-pointer"
              src="${src}"
              style="aspect-ratio: ${width} / ${height};"
            />
          </div>
        </div>`
      );
      newDiv.on("click", function () {
        showImage(this);
      });
      listImages.prepend(newDiv);
    });
  };

  const importImage = function (element) {
    const imageChange = $("#image-change");
    const trashAndImage = $("#trash-and-image");
    const file = $(element)[0].files[0];
    imageChange.attr("src", URL.createObjectURL(file));
    trashAndImage.show();

    const formData = new FormData();
    formData.append("image", file);
    $.ajax({
      type: "POST",
      url: "/import-image",
      data: formData,
      contentType: false,
      processData: false,
      success: function (response) {
        if (response.error) {
          showError(response.error);
          return;
        }
        showSuccess("Image imported successfully");
      },
      error: function (error) {
        showError("Error importing image");
        console.log(error);
      },
    });
  };

  const showSuccess = function (message) {
    toast.fire({
      icon: "success",
      title: message,
    });
  };

  const showError = function (message) {
    toast.fire({
      icon: "error",
      title: message,
    });
  };

  const showWarning = function (message) {
    toast.fire({
      icon: "warning",
      title: message,
    });
  };

  const showImage = function (element) {
    const imageUrl = $(element)
      .children("div")
      .children("div")
      .children("img")
      .attr("src");
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success",
        cancelButton: "btn btn-danger",
      },
      buttonsStyling: true,
    });
    swalWithBootstrapButtons
      .fire({
        imageUrl: imageUrl,
        imageAlt: "Image",
        showCancelButton: true,
        confirmButtonText: "Download Image",
        cancelButtonText: "Cancel",
        reverseButtons: true,
        imageHeight: 500,
      })
      .then((result) => {
        if (result.isConfirmed) {
          downloadImage(imageUrl.split("?")[0]);
        }
      });
  };

  const showImageDialog = function (
    imageTransferredURL,
    prompt,
    username,
    userAvatar,
    imageRawURL
  ) {
    getMetaImage(imageTransferredURL, function (width, height) {
      const aspectRatio = width / height;
      const imageDialogContainer = $("#image-dialog-container");
      const userAvatarDialog = $("#user-avatar-dialog");
      const usernameDialog = $("#user-name-dialog");
      const textPromptDialog = $("#text-prompt-dialog");
      const rawImageDialogRight = $("#raw-image-dialog-right");
      const rawImageDialogLeft = $("#raw-image-dialog-left");
      const textPromptContainer = $("#text-prompt-container");
      const transferredImage = $("#transferred-image-dialog").children("img");
      transferredImage.css({
        "aspect-ratio": aspectRatio,
      });
      transferredImage.attr("src", imageTransferredURL);
      textPromptDialog.text(prompt);
      usernameDialog.text(username);
      userAvatarDialog.attr("src", userAvatar);
      if (imageRawURL) {
        const imgRight = rawImageDialogRight
          .children("div")
          .children("div")
          .children("img");
        imgRight.attr("src", imageRawURL);
        imgRight.css({
          "aspect-ratio": aspectRatio,
        });
        const imgLeft = rawImageDialogLeft.children("img");
        imgLeft.attr("src", imageRawURL);
        imgLeft.css({
          "aspect-ratio": aspectRatio,
        });
        rawImageDialogRight.show();
      }
      prompt ? textPromptContainer.show() : textPromptContainer.hide();
      imageDialogContainer.addClass("flex");
      imageDialogContainer.removeClass("hidden");
    });
  };

  const downloadImage = function (imageUrl) {
    fetchImageURL(imageUrl).then((url) => {
      const fileName = imageUrl.split("/").pop();
      fetch(url).then((response) => {
        if (response.ok) {
          response.blob().then((blob) => {
            const blobData = window.URL.createObjectURL(blob);
            const downloadLink = $("<a>")
              .attr("href", blobData)
              .attr("download", fileName)
              .appendTo("body");
            downloadLink[0].click();
            downloadLink.remove();
          });
        }
      });
    });
  };

  const getMetaImage = function (url, callback) {
    var img = new Image();
    img.src = url;
    img.onload = function () {
      callback(this.width, this.height);
    };
  };

  const toggleUserAvatar = function () {
    $(".user-info-container").toggle();
  };

  const logout = function () {
    var cookies = $.cookie();
    for (var key in cookies) {
      $.removeCookie(key, { path: "/" });
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const openPopupLoginWithGoogle = function () {
    $.ajax({
      type: "GET",
      url: "/login",
      success: function (response) {
        window.open(response.url, "popup", "width=600,height=600");
      },
      error: function (error) {
        showError("Error logging in with Google");
        console.log(error);
      },
    });
  };

  const fetchExploreImagesInfiniteScroll = function () {
    loadingExplore = true;
    fetchImageFromExplore(takeExplore, lastCreateTimeExplore)
      .then((images) => {
        if (images.length === 0) {
          showWarning("No more images to show");
          return;
        }
        lastCreateTimeExplore = images[images.length - 1].create_time;
        images.forEach((image) => {
          getMetaImage(image.image_transferred_url, function (width, height) {
            const imageRawDiv = image.image_raw_url
              ? `<div style="width: 25%;">
                    <img
                      loading="lazy"
                      decoding="async"
                      src="${image.image_raw_url}"
                      class="w-full rounded-sm border border-solid border-slate-500/40"
                    />
                  </div>`
              : "";
            const newDiv = $("<div></div>");
            newDiv.addClass(
              "image-explore-container cursor-pointer relative transition-opacity duration-300 delay-500"
            );
            newDiv.html(
              `<div class="overflow-hidden rounded-lg">
                    <img
                      src="${image.image_transferred_url}"
                      class="image-explore cursor-zoom-in transition-hover duration-500 delay-500 w-full h-full flex"
                      decoding="async"
                      style="aspect-ratio: ${width} / ${height};"
                    />
                    <div
                      class="image-user-info w-full z-10 absolute right-0 top-0 px-3 py-2 flex items-center gap-2 justify-between invisible"
                    >
                      <div class="flex gap-2 w-full">
                        <div class="h-5 w-5">
                          <img src="${
                            image.user_avatar
                          }" class="w-5 h-5 cursor-default rounded-full" alt="avatar" />
                        </div>
                        <div class="w-28 lg:w-20 xl:w-28 py-0.5">
                          <div
                            class="whitespace-nowrap overflow-hidden font-semibold leading-4 text-xs"
                            style="text-overflow: ellipsis;"
                          >
                            ${image.user_name}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      class="image-prompt-container z-10 absolute inset-x-0 bottom-0 w-full invisible opacity-0 transition-opacity duration-300 delay-100"
                    >
                      <div
                        class="flex ${
                          image.image_raw_url ? "" : "h-14"
                        } background-gradient border-violet rounded-sm px-3 py-2"
                      >
                        <div
                          class="flex flex-col justify-end pr-1 font-bold" style="width: 75%;"
                        >
                          <p
                            class="whitespace-nowrap overflow-hidden text-xs text-white"
                            style="text-overflow: ellipsis;"
                          >
                            ${image.prompt ? image.prompt : ""}
                          </p>
                        </div>
                        ${imageRawDiv}
                      </div>
                    </div>
                  </div>`
            );
            newDiv.on("click", function () {
              showImageDialog(
                image.image_transferred_url,
                image.prompt,
                image.user_name,
                image.user_avatar,
                image.image_raw_url
              );
            });
            $(`#images-column-${currentColumn}`).append(newDiv);
            currentColumn = (currentColumn % columnCount) + 1;
          });
        });
        loadingExplore = false;
      })
      .catch((error) => {
        showError("Error fetching images");
        console.log(error);
        loadingExplore = false;
      });
  };

  const fetchMyCreationImagesInfiniteScroll = function () {
    loadingMyCreation = true;
    fetchImageFromMyCreation(
      userEmail,
      takeMyCreation,
      lastCreateTimeMyCreation
    ).then((images) => {
      if (images.length === 0) {
        showWarning("No more images to show");
        return;
      }
      lastCreateTimeMyCreation = images[images.length - 1].create_time;
      images.forEach((image) => {
        const { image_transferred_url, prompt } = image;
        getMetaImage(image_transferred_url, function (width, height) {
          const newDiv = $("<div></div>");
          newDiv.addClass("relative group");
          newDiv.attr("id", image.key);
          newDiv.html(`
            <div class="image-check overflow-hidden rounded-md">
              <img
                src="${image_transferred_url}"
                class="hover:cursor-zoom-in w-full h-full md:group-hover:brightness-50 transition-opacity duration-500 transition-hover flex"
                decoding="async"
                style="aspect-ratio: ${width} / ${height};"
              />
              <div
                class="select-mode-overlay hidden absolute left-2 top-2 w-5 h-5"
              >
                <div
                  class="rounded-full w-full h-full border-2"
                  style="border-color: #A855F7;"
                ></div>
                <img
                  class="hidden"
                  src="../static/images/rounded-checkbox.svg"
                  alt=""
                />
              </div>
              <div
                class="normal-mode-overlay visible group-hover:visible delay-150 md:invisible"
              >
                <div
                  class="flex flex-row place-content-between w-full absolute px-1 md:px-2 bottom-1 md:bottom-2 gap-1 md:justify-between justify-end"
                >
                  <div
                    class="bg-transparent p-1 rounded-md left-0 w-32 xl:w-48 md:flex hidden"
                  >
                    <div
                      class="whitespace-nowrap text-ellipsis overflow-hidden text-xs sm:text-sm 2xl:text-base text-white"
                    >${prompt}</div>
                  </div>
                </div>
              </div>
            </div>`);
          $(`#images-column-${currentColumn}`).append(newDiv);
          currentColumn = (currentColumn % columnCount) + 1;
        });
      });
      $(document).on("click", ".image-check", function () {
        selectImage(this);
      });
      loadingMyCreation = false;
    });
  };

  const fetchCreateImagesInfiniteScroll = function () {
    fetchImageFromCreate(userEmail).then((images) => {
      if (images.length === 0) {
        showWarning("No more images to show");
        return;
      }
      console.table(images);
      images.forEach((image) => {
        getMetaImage(image.image_transferred_url, function (width, height) {
          const newDiv = $("<div></div>");
          newDiv.addClass(
            "image-generated w-[136px] h-48 opacity-50 hover:opacity-100 image-placeholder-animation rounded-md overflow-hidden"
          );
          newDiv.html(
            `<div class="h-full w-full flex justify-center items-center">
              <div
                class="flex w-full h-full relative rounded-[6px] shadow-md justify-center"
              >
                <img
                  class="transition-all duration-500 object-fill cursor-pointer"
                  src="${image.image_transferred_url}"
                  style="aspect-ratio: ${height} / ${width};"
                />
              </div>
            </div>`
          );
          newDiv.on("click", function () {
            showImage(this);
          });
          $("#list-images").prepend(newDiv);
        });
      });
    });
  };

  const toggleSelectImages = function (element) {
    const text = $(element).children("div").first().text();
    const modalSelectedImages = $("#modal-selected-images");
    const listImages = $(".normal-mode-overlay");
    const listImagesSelect = $(".select-mode-overlay");
    if (text === "Select Images") {
      $(element).addClass("border-[#A855F7]");
      $(element).removeClass("border-[#C0C0C3]");
      $(element).children("div").first().text("Stop Selecting");
      modalSelectedImages.addClass("flex");
      modalSelectedImages.removeClass("hidden");
      listImages.each(function () {
        $(this).hide();
      });
      listImagesSelect.each(function () {
        $(this).show();
      });
    } else if (text === "Stop Selecting") {
      $(element).removeClass("border-[#A855F7]");
      $(element).addClass("border-[#C0C0C3]");
      $(element).children("div").first().text("Select Images");
      modalSelectedImages.removeClass("flex");
      modalSelectedImages.addClass("hidden");
      listImages.each(function () {
        $(this).show();
      });
      listImagesSelect.each(function () {
        $(this).hide();
      });
      unselectAllImages();
    }
  };

  const checkUser = async function () {
    if (!$.cookie("user_email")) {
      return false;
    }
    try {
      const exist = await checkUserExist($.cookie("user_email"));
      return exist;
    } catch (error) {
      console.log("Error checking user exist:", error);
      return false;
    }
  };

  const selectImage = function (element) {
    const firstDivChildren = $(element).children("div:first").children("div");
    const firstDivImages = $(element).children("div:first").children("img");
    const amountSelectedImages = $("#amount-selected-images");
    if (
      $("#btn-select-images").children("div").first().text() === "Select Images"
    )
      return;
    if (firstDivImages.hasClass("hidden")) {
      $(element).children("img").css({
        transform: "scale(0.78)",
        "border-radius": "0.5rem",
      });
      $(element).css({
        "border-width": "1px",
        "border-color": "#A855F7",
        "background-color": "#1B1131",
      });
      amountSelectedImages.text(parseInt(amountSelectedImages.text(), 10) + 1);
      $("#btn-download-list-imgs")
        .removeAttr("disabled")
        .css({ "background-color": "#504DE3" });
      $("#btn-delete-list-imgs")
        .removeAttr("disabled")
        .css({ "background-color": "#3F3D49" });
    } else {
      $(element).children("img").css({
        transform: "scale(1)",
        "border-radius": "0.75rem",
      });
      $(element).css({
        "border-width": "0px",
        "border-color": "#1B1131",
        "background-color": "#1B1131",
      });
      amountSelectedImages.text(parseInt(amountSelectedImages.text(), 10) - 1);
      if (amountSelectedImages.text() === "0") {
        $("#btn-download-list-imgs")
          .attr("disabled", "disabled")
          .css({ "background-color": "#2C2950" });
        $("#btn-delete-list-imgs")
          .attr("disabled", "disabled")
          .css({ "background-color": "#2D2A37" });
      }
    }
    firstDivChildren.toggleClass("hidden");
    firstDivImages.toggleClass("hidden");
  };

  const unselectAllImages = function () {
    const amountSelectedImages = $("#amount-selected-images");
    const listImages = $(".image-check");
    listImages.each(function () {
      $(this).children("img").css({
        transform: "scale(1)",
        "border-radius": "0.75rem",
      });
      $(this).css({
        "border-width": "0px",
        "border-color": "#1B1131",
        "background-color": "#1B1131",
      });
      $(this).children("div:first").children("div").removeClass("hidden");
      $(this).children("div:first").children("img").addClass("hidden");
    });
    amountSelectedImages.text("0");
    $("#btn-download-list-imgs").attr("disabled", "disabled");
    $("#btn-delete-list-imgs").attr("disabled", "disabled");
    $("#btn-download-list-imgs").css({ "background-color": "#2C2950" });
    $("#btn-delete-list-imgs").css({ "background-color": "#2D2A37" });
  };

  const downloadAndZipImages = function (imageUrls) {
    const zip = new JSZip();
    const imgFolder = zip.folder("images");
    const promises = imageUrls.map((imageUrl, index) => {
      return fetchImageURL(imageUrl).then((url) => {
        return fetch(url).then((response) => {
          if (response.ok) {
            return response.blob().then((blob) => {
              const fileName = imageUrl.split("?")[0].split("/").pop();
              imgFolder.file(fileName, blob);
            });
          }
        });
      });
    });

    Promise.all(promises).then(() => {
      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, "images.zip");
        unselectAllImages();
        $("#loading-overlay").removeClass("load");
        showSuccess("Images downloaded successfully");
      });
    });
  };

  const deleteImages = function () {
    const listImages = $(".image-check");
    const imageIds = [];
    listImages.each(function () {
      if (!$(this).children("div:first").children("img").hasClass("hidden")) {
        imageIds.push($(this).parent().attr("id"));
      }
    });
    if (imageIds.length === 0) {
      showWarning("No images selected");
      return;
    }
    updateImagesUI(imageIds);
  };

  const downloadListImages = function () {
    $("#loading-overlay").addClass("load");
    const listImages = $(".image-check");
    const imageUrls = [];
    listImages.each(function () {
      if (!$(this).children("div:first").children("img").hasClass("hidden")) {
        imageUrls.push($(this).children("img").attr("src"));
      }
    });
    if (imageUrls.length === 0) {
      showWarning("No images selected");
      return;
    }
    downloadAndZipImages(imageUrls);
  };

  const updateImagesUI = function (imageIds) {
    imageIds.forEach((imageId) => {
      $(`#${imageId}`).remove();
    });
    unselectAllImages();
    deleteListImages(userEmail, imageIds);
  };

  return {
    Init: Init,
    InitEvents: InitEvents,
  };
})();
