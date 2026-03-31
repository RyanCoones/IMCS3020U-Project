#A limitation of the hold-out validation set approach to training a stacking model 
# is that level 0 and level 1 models are not trained on the full dataset.


# load models from file
from fileinput import filename


def load_all_models():
	all_models = list()
    # load each model and add to list.  due to the small amount of models, we can just hard code the filenames.  
	
	all_models.append()
		print('>loaded %s' % filename)
	return all_models

# load all models

members = load_all_models()
print('Loaded %d models' % len(members))

# need a way to reference the test set.  which means I need knowledge of how the output of the level 0 models is stored, and in what format.  
# need to collect the data to feed into the level 1 model. this is the output of the level 0 models on the test set.


# fit a model based on the outputs from the ensemble members
def fit_stacked_model(members, inputX, inputy):
	# create dataset using ensemble
	stackedX = stacked_dataset(members, inputX)
	# fit standalone model
	model = LogisticRegression()
	model.fit(stackedX, inputy)
	return model

# fit stacked model using the ensemble
model = fit_stacked_model(members, testX, testy)

# make a prediction with the stacked model
def stacked_prediction(members, model, inputX):
	# create dataset using ensemble
	stackedX = stacked_dataset(members, inputX)
	# make a prediction
	yhat = model.predict(stackedX)
	return yhat

#this is using a linear regression model as the level 1 model. with some missing pieces.  
# but we could use something like a neural network to learn the relationships between the level 0 model outputs and the target variable.  
# this is a powerful approach, but it also requires more data to train the level 1 model effectively.